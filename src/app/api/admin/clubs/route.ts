import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import { ClubModel } from '@/database/models/club.model';
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
          verified: { $ifNull: ['$verified', false] },
          isActive: { $ifNull: ['$isActive', true] },
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

    // Calculate statistics for OAC Portal
    const stats = {
      total: clubs.length,
      verified: clubs.filter(c => c.verified === true).length,
      unverified: clubs.filter(c => c.verified !== true).length,
    };

    return NextResponse.json({ clubs, stats });

  } catch (error) {
    console.error('Error fetching clubs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch clubs' },
      { status: 500 }
    );
  }
}
