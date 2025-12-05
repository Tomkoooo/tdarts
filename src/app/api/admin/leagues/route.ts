import { NextRequest, NextResponse } from 'next/server';
import { LeagueModel } from '@/database/models/league.model';
import { UserModel } from '@/database/models/user.model';
import { connectMongo } from '@/lib/mongoose';
import jwt from 'jsonwebtoken';

export async function GET(req: NextRequest) {
  try {
    await connectMongo();

    // Check for internal API secret (for OAC Portal)
    const internalSecret = req.headers.get('x-internal-secret');
    const expectedSecret = process.env.INTERNAL_API_SECRET || 'development-secret-change-in-production';
    const isInternalRequest = internalSecret === expectedSecret;

    // If not internal request, verify admin JWT token (for tDarts admin)
    if (!isInternalRequest) {
      const token = req.cookies.get('token')?.value;
      if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
        const adminUser = await UserModel.findById(decoded.id).select('isAdmin');
        
        if (!adminUser?.isAdmin) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
      } catch (error) {
        console.error('Invalid token:', error);
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
      }
    }

    // Fetch all leagues with club info populated
    const leagues = await LeagueModel.find({})
      .populate('club', 'name verified')
      .select('name description pointSystemType isActive verified createdAt startDate endDate')
      .sort({ createdAt: -1 })
      .lean();

    // Calculate statistics
    const total = leagues.length;
    const verified = leagues.filter(league => league.verified === true).length;
    const unverified = total - verified;

    return NextResponse.json({
      leagues,
      stats: {
        total,
        verified,
        unverified,
      },
    });
  } catch (error) {
    console.error('Error fetching leagues:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
