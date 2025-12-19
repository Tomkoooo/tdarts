import { NextRequest, NextResponse } from 'next/server';
import { TournamentModel } from '@/database/models/tournament.model';
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
    
    // Get query parameters
    const { searchParams } = req.nextUrl;
    const status = searchParams.get('status'); // 'pending', 'active', 'finished'
    const leagueId = searchParams.get('leagueId');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const skip = parseInt(searchParams.get('skip') || '0', 10);

    // Find verified leagues
    const verifiedLeagues = await LeagueModel.find({ verified: true }).select('_id');
    const verifiedLeagueIds = verifiedLeagues.map(l => l._id);

    // Build query
    const query: any = {
      isDeleted: false,
      isCancelled: false,
      isSandbox: { $ne: true },
      $or: [
        { league: { $in: verifiedLeagueIds } },
        { verified: true }
      ]
    };

    // Filter by status
    if (status) {
      query['tournamentSettings.status'] = status;
    }

    // Filter by league
    if (leagueId) {
      query.league = leagueId;
    }

    // Get tournaments
    const tournaments = await TournamentModel.find(query)
      .select('tournamentId tournamentSettings clubId league tournamentPlayers verified')
      .populate('clubId', 'name location')
      .populate('league', 'name verified')
      .sort({ 'tournamentSettings.startDate': -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    const total = await TournamentModel.countDocuments(query);

    // Format response
    const formattedTournaments = tournaments.map((t: any) => ({
      _id: t._id,
      tournamentId: t.tournamentId,
      name: t.tournamentSettings?.name,
      startDate: t.tournamentSettings?.startDate,
      status: t.tournamentSettings?.status,
      location: t.tournamentSettings?.location,
      club: t.clubId,
      league: t.league,
      verified: t.verified || false,
      playerCount: t.tournamentPlayers?.length || 0,
    }));

    return NextResponse.json({
      tournaments: formattedTournaments,
      total,
      limit,
      skip
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching verified tournaments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
