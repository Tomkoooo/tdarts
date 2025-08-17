import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import { TournamentModel } from '@/database/models/tournament.model';
import { UserModel } from '@/database/models/user.model';
import jwt from 'jsonwebtoken';

export async function GET(request: NextRequest) {
  try {
    await connectMongo();
    
    // Verify admin access
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
    const adminUser = await UserModel.findById(decoded.id).select('isAdmin');
    
    if (!adminUser?.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch all tournaments with club information
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
        $addFields: {
          playerCount: { $size: { $ifNull: ['$tournamentPlayers', []] } }
        }
      },
      {
        $project: {
          name: '$tournamentSettings.name',
          description: '$tournamentSettings.description',
          status: '$tournamentSettings.status',
          tournamentType: '$tournamentSettings.format',
          startDate: '$tournamentSettings.startDate',
          endDate: '$tournamentSettings.endDate',
          playerCount: 1,
          createdAt: 1,
          isDeleted: { $ifNull: ['$isDeleted', false] },
          clubId: {
            _id: '$club._id',
            name: '$club.name'
          }
        }
      },
      {
        $sort: { createdAt: -1 }
      }
    ]);

    return NextResponse.json({ tournaments });

  } catch (error) {
    console.error('Error fetching tournaments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tournaments' },
      { status: 500 }
    );
  }
}
