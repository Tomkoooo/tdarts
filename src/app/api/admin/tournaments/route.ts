import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import { TournamentModel } from '@/database/models/tournament.model';
import { UserModel } from '@/database/models/user.model';
import jwt from 'jsonwebtoken';

export async function GET(request: NextRequest) {
  try {
    await connectMongo();
    
    // Check for internal API secret (for OAC Portal)
    const internalSecret = request.headers.get('x-internal-secret');
    const expectedSecret = process.env.INTERNAL_API_SECRET || 'development-secret-change-in-production';
    const isInternalRequest = internalSecret === expectedSecret;

    // If not internal request, verify admin JWT token (for tDarts admin)
    if (!isInternalRequest) {
      const token = request.cookies.get('token')?.value;
      if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
      const adminUser = await UserModel.findById(decoded.id).select('isAdmin');
      
      if (!adminUser?.isAdmin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Fetch all tournaments with club and league information
    const tournaments = await TournamentModel.aggregate([
      {
        $lookup: {
          from: 'clubs',
          localField: 'clubId',
          foreignField: '_id',
          as: 'club'
        }
      },
      {
        $unwind: '$club'
      },
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
          // A tournament is verified if it's attached to a verified league
          verified: {
            $cond: {
              if: { $gt: [{ $size: { $ifNull: ['$leagueInfo', []] } }, 0] },
              then: { $first: '$leagueInfo.verified' },
              else: false
            }
          }
        }
      },
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
          verified: 1,
          createdAt: 1,
          isDeleted: { $ifNull: ['$isDeleted', false] },
          clubId: {
            _id: '$club._id',
            name: '$club.name'
          },
          league: { $arrayElemAt: ['$leagueInfo', 0] }
        }
      },
      {
        $sort: { createdAt: -1 }
      }
    ]);

    // Calculate statistics
    const stats = {
      total: tournaments.length,
      verified: tournaments.filter(t => t.verified === true).length,
      unverified: tournaments.filter(t => t.verified !== true).length,
    };

    return NextResponse.json({ tournaments, stats });

  } catch (error) {
    console.error('Error fetching tournaments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tournaments' },
      { status: 500 }
    );
  }
}
