import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import { ClubModel } from '@/database/models/club.model';
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

    // Fetch all clubs with member and tournament counts
    const clubs = await ClubModel.aggregate([
      {
        $lookup: {
          from: 'tournaments',
          localField: '_id',
          foreignField: 'clubId',
          as: 'tournaments'
        }
      },
      {
        $addFields: {
          memberCount: { $size: { $ifNull: ['$members', []] } },
          tournamentCount: { $size: { $ifNull: ['$tournaments', []] } }
        }
      },
      {
        $project: {
          name: 1,
          description: 1,
          location: 1,
          subscriptionModel: 1,
          createdAt: 1,
          isDeleted: { $ifNull: ['$isDeleted', false] },
          memberCount: 1,
          tournamentCount: 1,
          // Also include the actual arrays for compatibility
          members: { $ifNull: ['$members', []] },
          tournaments: { $ifNull: ['$tournaments', []] }
        }
      },
      {
        $sort: { createdAt: -1 }
      }
    ]);

    return NextResponse.json({ clubs });

  } catch (error) {
    console.error('Error fetching clubs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch clubs' },
      { status: 500 }
    );
  }
}
