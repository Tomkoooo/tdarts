import { NextRequest, NextResponse } from 'next/server';
import { LeagueModel } from '@/database/models/league.model';
import { connectMongo } from '@/lib/mongoose';
import { validateInternalSecret, unauthorizedResponse } from '@/lib/api-auth.middleware';

export async function GET(req: NextRequest) {
  try {
    // Validate internal secret
    if (!validateInternalSecret(req)) {
      return unauthorizedResponse();
    }

    await connectMongo();
    
    const leagues = await LeagueModel.find({ isActive: true, verified: true })
      .select('name description verified pointSystemType startDate endDate attachedTournaments club')
      .populate('club', 'name location')
      .lean();

    // Add tournament count
    const leaguesWithCounts = leagues.map((league: any) => ({
      _id: league._id,
      name: league.name,
      description: league.description,
      verified: league.verified,
      pointSystemType: league.pointSystemType,
      startDate: league.startDate,
      endDate: league.endDate,
      club: league.club,
      tournamentCount: league.attachedTournaments?.length || 0,
    }));

    return NextResponse.json({
      leagues: leaguesWithCounts,
      total: leaguesWithCounts.length
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching verified leagues:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
