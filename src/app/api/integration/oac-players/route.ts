import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import { TournamentModel } from '@/database/models/tournament.model';

// Export all OAC players with populated data (names, emails)
// Requires internal secret for authentication
export async function GET(request: NextRequest) {
  try {
    // Verify internal secret
    const internalSecret = request.headers.get('x-internal-secret');
    if (internalSecret !== process.env.INTERNAL_API_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectMongo();

    // Get all unique players from verified tournaments with their full data
    const players = await TournamentModel.aggregate([
      {
        $match: {
          verified: true,
          isDeleted: false,
          isCancelled: false
        }
      },
      {
        $unwind: '$tournamentPlayers'
      },
      {
        // Convert string playerReference to ObjectId for $lookup
        $addFields: {
          playerRefObj: { $toObjectId: '$tournamentPlayers.playerReference' }
        }
      },
      {
        // Join with players collection
        $lookup: {
          from: 'players',
          localField: 'playerRefObj',
          foreignField: '_id',
          as: 'playerDoc'
        }
      },
      {
        $unwind: '$playerDoc'
      },
      {
        // Join with users collection for extra data
        $lookup: {
          from: 'users',
          localField: 'playerDoc.userRef',
          foreignField: '_id',
          as: 'userDoc'
        }
      },
      {
        $unwind: {
          path: '$userDoc',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $group: {
          _id: '$playerDoc._id',
          name: { $first: '$playerDoc.name' },
          email: { $first: '$userDoc.email' },
          phone: { $first: '$userDoc.phone' },
          city: { $first: '$userDoc.city' },
          dateOfBirth: { $first: '$userDoc.dateOfBirth' },
          createdAt: { $first: '$playerDoc.createdAt' },
          totalTournaments: { $sum: 1 },
          averageStats: {
            $push: {
              tournamentId: '$_id',
              tournamentName: '$tournamentSettings.name',
              avg: '$tournamentPlayers.stats.avg',
              oneEighties: '$tournamentPlayers.stats.oneEightiesCount',
              highestCheckout: '$tournamentPlayers.stats.highestCheckout'
            }
          }
        }
      },
      {
        $project: {
          _id: 1,
          name: 1,
          email: 1,
          phone: 1,
          city: 1,
          dateOfBirth: 1,
          createdAt: 1,
          totalTournaments: 1,
          overallAverage: { $avg: '$averageStats.avg' },
          maxAverage: { $max: '$averageStats.avg' },
          totalOneEighties: { $sum: '$averageStats.oneEighties' },
          maxCheckout: { $max: '$averageStats.highestCheckout' },
          tournaments: '$averageStats'
        }
      },
      {
        $sort: { overallAverage: -1 }
      }
    ]);

    return NextResponse.json({
      players,
      totalCount: players.length,
      exportedAt: new Date().toISOString()
    }, { status: 200 });

  } catch (error) {
    console.error('Error exporting OAC players:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
