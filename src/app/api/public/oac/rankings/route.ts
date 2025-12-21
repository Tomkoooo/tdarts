import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import { TournamentModel } from '@/database/models/tournament.model';

export async function GET(req: NextRequest) {
  try {
    await connectMongo();
    
    // Get query parameters
    const { searchParams } = req.nextUrl;
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const skip = parseInt(searchParams.get('skip') || '0', 10);
    const search = searchParams.get('search') || '';

    // MongoDB Aggregation Pipeline
    const pipeline: any[] = [
      // 1. Find verified OAC tournaments
      {
        $match: {
          verified: true,
          isDeleted: false,
          isCancelled: false,
          isSandbox: { $ne: true }
        }
      },
      // 2. Unwind players
      {
        $unwind: '$tournamentPlayers'
      },
      // 3. Group by player to get verified tournament stats
      {
        $group: {
          _id: { $toObjectId: '$tournamentPlayers.playerReference' },
          verifiedAvg: { $avg: '$tournamentPlayers.stats.avg' },
          verifiedMaxAvg: { $max: '$tournamentPlayers.stats.avg' },
          verifiedMaxCheckout: { $max: '$tournamentPlayers.stats.highestCheckout' },
          verifiedTotal180s: { $sum: '$tournamentPlayers.stats.oneEightiesCount' },
          verifiedTournamentsPlayed: { $sum: 1 }
        }
      },
      // 4. Join with player details
      {
        $lookup: {
          from: 'players',
          localField: '_id',
          foreignField: '_id',
          as: 'playerDoc'
        }
      },
      {
        $unwind: '$playerDoc'
      },
      // 5. Select fields and calculate final stats
      {
        $project: {
          _id: 1,
          name: '$playerDoc.name',
          oacMmr: { $ifNull: ['$playerDoc.stats.oacMmr', 800] },
          avg: { $round: ['$verifiedAvg', 2] },
          maxAvg: { $round: ['$verifiedMaxAvg', 2] },
          maxCheckout: { $ifNull: ['$verifiedMaxCheckout', 0] },
          total180s: { $ifNull: ['$verifiedTotal180s', 0] },
          tournamentsPlayed: '$verifiedTournamentsPlayed'
        }
      }
    ];

    // Search filter if provided
    if (search) {
      pipeline.push({
        $match: {
          name: { $regex: search, $options: 'i' }
        }
      });
    }

    // Sort by OAC MMR
    pipeline.push({ $sort: { oacMmr: -1, name: 1 } });

    // Execute aggregation for total count (before limit/skip)
    const countPipeline = [...pipeline, { $count: 'total' }];
    const countResult = await TournamentModel.aggregate(countPipeline);
    const total = countResult[0]?.total || 0;

    // Apply pagination
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: limit });

    // Execute final aggregation
    const rankings = await TournamentModel.aggregate(pipeline);

    return NextResponse.json({
      rankings,
      total,
      limit,
      skip
    }, { status: 200 });

  } catch (error) {
    console.error('Error in OAC Rankings API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
