import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import { ClubModel } from '@/database/models/club.model';

// This endpoint provides verified club data for the OAC portal
// Requires internal secret for authentication
export async function GET(request: NextRequest) {
  try {
    // Verify internal secret
    const internalSecret = request.headers.get('x-internal-secret');
    if (internalSecret !== process.env.INTERNAL_API_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectMongo();

    // Fetch verified clubs with aggregation to get counts
    const clubs = await ClubModel.aggregate([
      {
        $match: {
          verified: true,
          isActive: true,
          isDeleted: { $ne: true }
        }
      },
      {
        $lookup: {
          from: 'tournaments',
          let: { clubId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$clubId', '$$clubId'] },
                isDeleted: { $ne: true },
                isCancelled: { $ne: true }
              }
            }
          ],
          as: 'tournaments'
        }
      },
      {
        $addFields: {
          memberCount: { $size: { $ifNull: ['$members', []] } },
          tournamentCount: { $size: '$tournaments' }
        }
      },
      {
        $project: {
          _id: 1,
          name: 1,
          description: 1,
          location: 1,
          verified: 1,
          isActive: 1,
          createdAt: 1,
          memberCount: 1,
          tournamentCount: 1
        }
      },
      {
        $sort: { createdAt: -1 }
      }
    ]);

    return NextResponse.json({
      clubs,
      stats: {
        total: clubs.length,
        verified: clubs.length,
        unverified: 0
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Error fetching OAC clubs:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
