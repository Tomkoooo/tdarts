import { NextRequest, NextResponse } from 'next/server';
import { TournamentModel } from '@/database/models/tournament.model';
import { PlayerModel } from '@/database/models/player.model';
import { LeagueModel } from '@/database/models/league.model';
import { connectMongo } from '@/lib/mongoose';
import { validateInternalSecret, unauthorizedResponse } from '@/lib/api-auth.middleware';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
  try {
    // Validate internal secret
    if (!validateInternalSecret(req)) {
      return unauthorizedResponse();
    }

    await connectMongo();
    
    // Get query parameters
    const { searchParams } = req.nextUrl;
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const skip = parseInt(searchParams.get('skip') || '0', 10);

    // Find verified leagues
    const verifiedLeagues = await LeagueModel.find({ verified: true }).select('_id');
    const verifiedLeagueIds = verifiedLeagues.map(l => l._id);

    // Find all verified tournaments
    const verifiedTournaments = await TournamentModel.find({
      isDeleted: false,
      isCancelled: false,
      isSandbox: { $ne: true },
      $or: [
        { league: { $in: verifiedLeagueIds } },
        { verified: true }
      ]
    }).select('_id tournamentPlayers');

    // Extract unique player IDs from verified tournaments
    const playerIds = new Set<string>();
    const playerTournamentCounts = new Map<string, number>();

    for (const tournament of verifiedTournaments) {
      if (tournament.tournamentPlayers) {
        for (const tp of tournament.tournamentPlayers) {
          const playerId = typeof tp.playerReference === 'object' 
            ? tp.playerReference.toString() 
            : tp.playerReference;
          
          playerIds.add(playerId);
          
          // Count tournaments
          const currentCount = playerTournamentCounts.get(playerId) || 0;
          playerTournamentCounts.set(playerId, currentCount + 1);
        }
      }
    }

    // Convert to array and apply pagination
    const playerIdArray = Array.from(playerIds);
    const paginatedIds = playerIdArray.slice(skip, skip + limit);

    // Fetch player details
    const players = await PlayerModel.find({
      _id: { $in: paginatedIds.map(id => new mongoose.Types.ObjectId(id)) }
    })
      .select('name isRegistered stats')
      .lean();

    // Add verified tournament count
    const playersWithCounts = players.map((player: any) => ({
      _id: player._id,
      name: player.name,
      isRegistered: player.isRegistered,
      stats: {
        tournamentsPlayed: player.stats?.tournamentsPlayed || 0,
        avg: player.stats?.avg || 0,
        mmr: player.stats?.mmr || 800,
      },
      verifiedTournamentCount: playerTournamentCounts.get(player._id.toString()) || 0,
    }));

    return NextResponse.json({
      players: playersWithCounts,
      total: playerIdArray.length,
      limit,
      skip
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching verified players:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
