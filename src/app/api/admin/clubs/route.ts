import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import { ClubModel } from '@/database/models/club.model';
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
    const verifiedFilter = searchParams.get('verified') || 'all'; // all, verified, unverified

    const skip = (page - 1) * limit;

    // Match Stage for Filtering
    const matchStage: any = {};
    
    // Search Filter
    if (search) {
      matchStage.$or = [
        { name: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Verified Filter
    if (verifiedFilter === 'verified') {
      matchStage.verified = true;
    } else if (verifiedFilter === 'unverified') {
      matchStage.verified = { $ne: true };
    }

    // 1. Fetch Paginated Clubs
    const clubsQuery = ClubModel.aggregate([
      { $match: matchStage },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      // Lookup details only for the paginated results
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
          // Optimization: Don't return huge arrays if not needed, but keep if frontend uses them (User page didn't use arrays really)
          // Keeping consistent with previous response structure
          members: { $ifNull: ['$members', []] }, 
          tournaments: { $ifNull: ['$tournaments', []] }
        }
      }
    ]);

    // 2. Global Stats (independent of pagination, but using match for Total if we want "Total Filtered"?)
    // Actually, stats usually show GLOBAL numbers (Active, Verified, Total).
    // And pagination shows "Showing X of Y results".
    
    const [clubs, globalStats, totalFiltered] = await Promise.all([
      clubsQuery,
      // Global Stats
      ClubModel.aggregate([
         {
          $group: {
            _id: null,
            total: { $sum: 1 },
            active: { $sum: { $cond: [{ $eq: ["$isDeleted", true] }, 0, 1] } }, // Assuming isActive usually refers to not deleted or explicitly active
            deleted: { $sum: { $cond: [{ $eq: ["$isDeleted", true] }, 1, 0] } },
            verified: { $sum: { $cond: ["$verified", 1, 0] } },
            unverified: { $sum: { $cond: ["$verified", 0, 1] } },
            // Sum member counts? Harder without lookups on all docs. 
            // Let's approximate or do a separate lookup if needed. 
            // For now, simple counts. 
            // Previous code calculated totalMembers by reducing ALL clubs. That's heavy.
            // Let's skip totalMembers/totalTournaments global sum for performance unless requested.
            // Or use a separate robust aggregation if strictly needed.
          }
         }
      ]),
      // Total count for current filter
      ClubModel.countDocuments(matchStage)
    ]);

    const statsData = globalStats[0] || { total: 0, active: 0, deleted: 0, verified: 0, unverified: 0 };

    return NextResponse.json({
      clubs,
      pagination: {
        total: totalFiltered,
        page,
        totalPages: Math.ceil(totalFiltered / limit)
      },
      stats: {
        total: statsData.total,
        active: statsData.active,
        deleted: statsData.deleted,
        verified: statsData.verified,
        unverified: statsData.unverified
      }
    });

  } catch (error) {
    console.error('Error fetching clubs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch clubs' },
      { status: 500 }
    );
  }
}
