import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import { TournamentModel } from '@/database/models/tournament.model';
import { UserModel } from '@/database/models/user.model';
import jwt from 'jsonwebtoken';

export async function GET(request: NextRequest) {
  try {
    await connectMongo();
    
    // Standard Admin Auth (Cookie -> JWT -> DB)
    const token = request.cookies.get('token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
      const user = await UserModel.findById(decoded.id).select('isAdmin');
      
      if (!user?.isAdmin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } catch (error) {
       console.error('Invalid token:', error);
       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';
    const verifiedFilter = searchParams.get('verified') || 'all'; // all, verified, unverified
    const sandboxFilter = searchParams.get('sandbox') || 'all'; // all, active, sandbox

    const skip = (page - 1) * limit;

    // Base Aggegation Stages (Lookup & Fields) for filtering
    const baseStages: any[] = [
      {
        $lookup: {
          from: 'clubs',
          localField: 'clubId',
          foreignField: '_id',
          as: 'club'
        }
      },
      { $unwind: '$club' }, // Tournaments must have a club? Usually yes.
      {
        $lookup: {
          from: 'leagues',
          localField: 'league',
          foreignField: '_id',
          as: 'leagueInfo'
        }
      },
      {
        $addFields: {
          playerCount: { $size: { $ifNull: ['$tournamentPlayers', []] } },
          // A tournament is verified if it is explicitly verified OR attached to a verified league
          isVerified: {
            $or: [
              { $eq: ['$verified', true] },
              {
                $cond: {
                  if: { $gt: [{ $size: { $ifNull: ['$leagueInfo', []] } }, 0] },
                  then: { $arrayElemAt: ['$leagueInfo.verified', 0] },
                  else: false
                }
              }
            ]
          }
        }
      }
    ];

    // Build Match Stage based on Filters
    const matchStage: any = {};

    // 1. Search (Name, Description, Club Name)
    if (search) {
      matchStage.$or = [
        { 'tournamentSettings.name': { $regex: search, $options: 'i' } },
        { 'tournamentSettings.description': { $regex: search, $options: 'i' } },
        { 'club.name': { $regex: search, $options: 'i' } }
      ];
    }

    // 2. Status Filter
    if (status !== 'all') {
      matchStage['tournamentSettings.status'] = status;
    }

    // 3. Verified Filter
    if (verifiedFilter === 'verified') {
      matchStage.isVerified = true;
    } else if (verifiedFilter === 'unverified') {
      matchStage.isVerified = { $ne: true };
    }

    // 4. Sandbox Filter
    if (sandboxFilter === 'sandbox') {
      matchStage.isSandbox = true;
    } else if (sandboxFilter === 'active') {
      matchStage.isSandbox = { $ne: true };
    }

    // --- Execute Queries in Parallel ---
    
    // 1. Filtered Data & Count
    const dataQuery = TournamentModel.aggregate([
      ...baseStages,
      { $match: matchStage },
      { $sort: { createdAt: -1 } },
      {
        $facet: {
          metadata: [{ $count: "total" }],
          data: [
            { $skip: skip },
            { $limit: limit },
            {
              $project: {
                tournamentId: '$tournamentId',
                name: '$tournamentSettings.name',
                description: '$tournamentSettings.description',
                status: '$tournamentSettings.status',
                tournamentType: '$tournamentSettings.format',
                startDate: '$tournamentSettings.startDate',
                endDate: '$tournamentSettings.endDate',
                playerCount: 1,
                verified: '$isVerified',
                createdAt: 1,
                isDeleted: { $ifNull: ['$isDeleted', false] },
                isSandbox: { $ifNull: ['$isSandbox', false] },
                clubId: {
                  _id: '$club._id',
                  name: '$club.name'
                },
                league: { $arrayElemAt: ['$leagueInfo', 0] }
              }
            }
          ]
        }
      }
    ]);

    // 2. Global Stats (Independent of filters)
    // We need to run baseStages to get verified/playerCount for stats aggregation
    const statsQuery = TournamentModel.aggregate([
      ...baseStages,
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: [{ $in: ['$tournamentSettings.status', ['active', 'group-stage', 'knockout']] }, 1, 0] } },
          finished: { $sum: { $cond: [{ $eq: ['$tournamentSettings.status', 'finished'] }, 1, 0] } },
          pending: { $sum: { $cond: [{ $eq: ['$tournamentSettings.status', 'pending'] }, 1, 0] } },
          totalPlayers: { $sum: '$playerCount' },
          verified: { $sum: { $cond: ['$isVerified', 1, 0] } },
          unverified: { $sum: { $cond: ['$isVerified', 0, 1] } },
          sandbox: { $sum: { $cond: ['$isSandbox', 1, 0] } }
        }
      }
    ]);

    const [dataResult, statsResult] = await Promise.all([dataQuery, statsQuery]);

    const paginationData = dataResult[0].metadata[0] || { total: 0 };
    const tournaments = dataResult[0].data || [];
    const statsData = statsResult[0] || { total: 0, active: 0, finished: 0, pending: 0, totalPlayers: 0, verified: 0, unverified: 0, sandbox: 0 };

    return NextResponse.json({
      tournaments,
      pagination: {
        total: paginationData.total,
        page,
        totalPages: Math.ceil(paginationData.total / limit)
      },
      stats: {
        total: statsData.total,
        active: statsData.active,
        finished: statsData.finished,
        pending: statsData.pending,
        totalPlayers: statsData.totalPlayers,
        verified: statsData.verified,
        unverified: statsData.unverified,
        sandbox: statsData.sandbox
      }
    });

  } catch (error) {
    console.error('Error fetching tournaments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tournaments' },
      { status: 500 }
    );
  }
}
