import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import { LeagueModel } from '@/database/models/league.model';
import { withApiTelemetry } from '@/lib/api-telemetry';

async function __GET(request: NextRequest) {
  try {
    await connectMongo();
    
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '10');
    const page = parseInt(searchParams.get('page') || '1');
    const skip = (page - 1) * limit;

    // Build query for active leagues
    const query: any = {
      isActive: { $ne: false },
      // You might want to add logic here to filter out "closed" leagues if there's a specific field for that
      // For now, assuming isActive handles it or we check dates
    };

    // If we want to filter by date to show only "open" leagues (not finished)
    // query.endDate = { $gte: new Date() }; 

    const [leagues, total] = await Promise.all([
      LeagueModel.find(query)
        .populate('club', 'name location verified')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      LeagueModel.countDocuments(query)
    ]);

    return NextResponse.json({
      success: true,
      leagues,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });

  } catch (error) {
    console.error('Error fetching leagues:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch leagues' },
      { status: 500 }
    );
  }
}

export const GET = withApiTelemetry('/api/search/leagues', __GET as any);
