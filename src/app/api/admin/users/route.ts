import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import { UserModel } from '@/database/models/user.model';
import { PlayerModel } from '@/database/models/player.model';
import jwt from 'jsonwebtoken';
import { withApiTelemetry } from '@/lib/api-telemetry';

async function __GET(request: NextRequest) {
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

    // Filter Parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || 'all'; // all, admin, user
    const skip = (page - 1) * limit;

    // Build Query
    const query: any = { isDeleted: { $ne: true } };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } }
      ];
    }

    if (role === 'admin') {
      query.isAdmin = true;
    } else if (role === 'user') {
      query.isAdmin = false;
    }

    // Fetch Data & Stats using Aggregation
    const [usersData, stats, filteredTotal] = await Promise.all([
      // 1. Paginated Users
      UserModel.find(query)
        .select('name email username isAdmin isVerified createdAt lastLogin')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      
      // 2. Global Stats
      UserModel.aggregate([
        { $match: { isDeleted: { $ne: true } } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            admins: { $sum: { $cond: ["$isAdmin", 1, 0] } },
            verified: { $sum: { $cond: ["$isVerified", 1, 0] } },
            unverified: { $sum: { $cond: ["$isVerified", 0, 1] } }
          }
        }
      ]),
      
      // 3. Total count for current filter (for pagination)
      UserModel.countDocuments(query)
    ]);

    const userIds = usersData.map((user: any) => user._id);
    const linkedPlayers = await PlayerModel.find({
      userRef: { $in: userIds },
      type: 'individual',
    })
      .select('_id userRef name honors')
      .lean();

    const playerByUserId = new Map(
      linkedPlayers.map((player: any) => [String(player.userRef), player])
    );

    const usersWithPlayerData = usersData.map((user: any) => {
      const linkedPlayer = playerByUserId.get(String(user._id));
      return {
        ...user,
        playerProfile: linkedPlayer
          ? {
              _id: linkedPlayer._id,
              name: linkedPlayer.name,
              honors: linkedPlayer.honors || [],
            }
          : null,
      };
    });

    const globalStats = stats[0] || { total: 0, admins: 0, verified: 0, unverified: 0 };

    return NextResponse.json({
      users: usersWithPlayerData,
      pagination: {
        total: filteredTotal, // Total matches for search
        page,
        totalPages: Math.ceil(filteredTotal / limit)
      },
      stats: {
        total: globalStats.total,
        admins: globalStats.admins,
        verified: globalStats.verified,
        unverified: globalStats.unverified
      }
    });

  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

export const GET = withApiTelemetry('/api/admin/users', __GET as any);
