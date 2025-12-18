import { NextRequest, NextResponse } from 'next/server';
import { LeagueModel } from '@/database/models/league.model';
import { UserModel } from '@/database/models/user.model';
import { connectMongo } from '@/lib/mongoose';
import jwt from 'jsonwebtoken';

export async function GET(req: NextRequest) {
  try {
    await connectMongo();

    // Standard Admin Auth (Cookie -> JWT -> DB)
    const token = req.cookies.get('token')?.value;
    
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
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const verifiedFilter = searchParams.get('verified') || 'all'; // all, verified, unverified

    const skip = (page - 1) * limit;

    // Match Stage for Filters
    const matchStage: any = {};

    // 1. Search (Name or Club Name)
    if (search) {
      matchStage.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { 'club.name': { $regex: search, $options: 'i' } }
      ];
    }

    // 2. Verified Filter
    if (verifiedFilter === 'verified') {
      matchStage.verified = true;
    } else if (verifiedFilter === 'unverified') {
      matchStage.verified = { $ne: true };
    }

    // Base Pipeline (Lookup Club)
    // We need to lookup FIRST if we want to search by club name
    const lookupStage = [
      {
        $lookup: {
          from: 'clubs',
          localField: 'club',
          foreignField: '_id',
          as: 'club'
        }
      },
      {
        $unwind: {
          path: '$club',
          preserveNullAndEmptyArrays: true // Leagues might theoretically not have a club if specific type? Assuming usually yes.
        }
      }
    ];

    // Queries
    const dataQuery = LeagueModel.aggregate([
      ...lookupStage,
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
                 name: 1,
                 description: 1,
                 pointSystemType: 1,
                 verified: 1,
                 isActive: 1,
                 createdAt: 1,
                 startDate: 1,
                 endDate: 1,
                 club: {
                   _id: '$club._id',
                   name: '$club.name',
                   verified: '$club.verified'
                 }
               }
            }
          ]
        }
      }
    ]);

    // Stats Query (Global)
    const statsQuery = LeagueModel.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          verified: { $sum: { $cond: ['$verified', 1, 0] } },
          unverified: { $sum: { $cond: ['$verified', 0, 1] } }
        }
      }
    ]);

    const [dataResult, statsResult] = await Promise.all([dataQuery, statsQuery]);

    const paginationData = dataResult[0].metadata[0] || { total: 0 };
    const leagues = dataResult[0].data || [];
    const statsData = statsResult[0] || { total: 0, verified: 0, unverified: 0 };

    return NextResponse.json({
      leagues,
      pagination: {
        total: paginationData.total,
        page,
        totalPages: Math.ceil(paginationData.total / limit)
      },
      stats: {
        total: statsData.total,
        verified: statsData.verified,
        unverified: statsData.unverified,
      }
    });

  } catch (error) {
    console.error('Error fetching leagues:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
