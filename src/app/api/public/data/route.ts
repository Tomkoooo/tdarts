import { NextRequest, NextResponse } from 'next/server';
import { LeagueModel } from '@/database/models/league.model';
import { TournamentModel } from '@/database/models/tournament.model';
import { connectMongo } from '@/lib/mongoose';

export async function GET(req: NextRequest) {
  try {
    await connectMongo();
    
    // Get query parameters for filtering
    const type = req.nextUrl.searchParams.get('type'); // 'leagues' or 'tournaments' or 'all'
    const status = req.nextUrl.searchParams.get('status'); // 'ongoing', 'upcoming', 'finished'
    
    const response: any = {};

    if (type === 'leagues' || !type || type === 'all') {
      const leagues = await LeagueModel.find({ isActive: true })
        .select('name description startDate endDate verified pointSystemType club')
        .populate('club', 'name location')
        .sort({ startDate: -1 })
        .limit(20);
      response.leagues = leagues;
    }

    if (type === 'tournaments' || !type || type === 'all') {
      const query: any = { isDeleted: false, isCancelled: false };
      
      if (status === 'ongoing') {
        query['tournamentSettings.status'] = 'in_progress';
      } else if (status === 'upcoming') {
        query['tournamentSettings.status'] = 'pending';
      } else if (status === 'finished') {
        query['tournamentSettings.status'] = 'finished';
      }

      const tournaments = await TournamentModel.find(query)
        .select('tournamentSettings clubId league')
        .populate('clubId', 'name location')
        .populate('league', 'name verified')
        .sort({ 'tournamentSettings.startDate': -1 })
        .limit(20);
        
      response.tournaments = tournaments;
    }

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Error fetching public data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
