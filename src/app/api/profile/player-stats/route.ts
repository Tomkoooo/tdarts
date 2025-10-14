import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import { PlayerModel } from '@/database/models/player.model';
import { TournamentModel } from '@/database/models/tournament.model';
import { MatchModel } from '@/database/models/match.model';
import jwt from 'jsonwebtoken';
import { UserModel } from '@/database/models/user.model';

export async function GET(request: NextRequest) {
  try {
    await connectMongo();
    
    // Verify user access
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
    const user = await UserModel.findById(decoded.id);
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Find the player associated with this user
    const player = await PlayerModel.findOne({ userRef: user._id });
    
    if (!player) {
      return NextResponse.json({ 
        success: true, 
        hasPlayer: false,
        message: 'No player profile found for this user'
      });
    }

    // Get player statistics
    const playerStats = player.stats || {};
    const mmr = playerStats.mmr ?? 800;

    // Get global ranking position
    const allPlayers = await PlayerModel.find().select('_id stats.mmr');
    const sortedPlayers = allPlayers.sort((a, b) => {
      const aMMR = a.stats?.mmr ?? 800;
      const bMMR = b.stats?.mmr ?? 800;
      if (bMMR !== aMMR) return bMMR - aMMR;
      return a._id.toString().localeCompare(b._id.toString());
    });
    
    const globalRank = sortedPlayers.findIndex(p => p._id.toString() === player._id.toString()) + 1;

    // Get MMR tier
    const getMMRTier = (mmr: number) => {
      if (mmr >= 1600) return { name: 'Elit', color: 'text-error' };
      if (mmr >= 1400) return { name: 'Mester', color: 'text-warning' };
      if (mmr >= 1200) return { name: 'Haladó', color: 'text-info' };
      if (mmr >= 1000) return { name: 'Középhaladó', color: 'text-success' };
      if (mmr >= 800) return { name: 'Kezdő+', color: 'text-primary' };
      return { name: 'Kezdő', color: 'text-base-content' };
    };

    // Get tournaments where this player participated
    const tournaments = await TournamentModel.find({
      'tournamentPlayers.playerReference': player._id
    })
    .populate('clubId', 'name location')
    .select('tournamentId tournamentSettings.name tournamentSettings.startDate tournamentSettings.status tournamentPlayers')
    .sort({ 'tournamentSettings.startDate': -1 })
    .limit(10);

    // Process tournament data
    const tournamentHistory = tournaments.map(tournament => {
      const playerInTournament = tournament.tournamentPlayers.find(
        (tp: any) => tp.playerReference?.toString() === player._id.toString()
      );
      
      return {
        _id: tournament._id,
        tournamentId: tournament.tournamentId,
        name: tournament.tournamentSettings?.name,
        startDate: tournament.tournamentSettings?.startDate,
        status: tournament.tournamentSettings?.status,
        clubName: tournament.clubId?.name,
        clubLocation: tournament.clubId?.location,
        playerStats: playerInTournament?.stats || {},
        finalPosition: playerInTournament?.finalPosition
      };
    });

    // Get recent matches
    const recentMatches = await MatchModel.find({
      $or: [
        { 'player1.playerId': player._id },
        { 'player2.playerId': player._id }
      ],
      status: 'finished'
    })
    .populate('player1.playerId', 'name')
    .populate('player2.playerId', 'name')
    .select('player1 player2 legs createdAt')
    .sort({ createdAt: -1 })
    .limit(5);

    const matchHistory = recentMatches.map(match => {
      const isPlayer1 = match.player1.playerId?._id?.toString() === player._id.toString();
      const opponent = isPlayer1 ? match.player2 : match.player1;
      const playerData = isPlayer1 ? match.player1 : match.player2;
      
      return {
        _id: match._id,
        opponent: opponent.playerId?.name || 'Ismeretlen',
        player1Score: match.player1.legsWon || 0,
        player2Score: match.player2.legsWon || 0,
        won: playerData.legsWon > (isPlayer1 ? match.player2.legsWon : match.player1.legsWon),
        date: match.createdAt,
        legs: match.legs?.length || 0
      };
    });

    const playerData = {
      hasPlayer: true,
      player: {
        _id: player._id,
        name: player.name,
        stats: {
          ...playerStats,
          mmr: mmr,
          globalRank: globalRank,
          mmrTier: getMMRTier(mmr)
        }
      },
      tournamentHistory,
      matchHistory,
      summary: {
        totalTournaments: tournamentHistory.length,
        totalMatches: matchHistory.length,
        wins: matchHistory.filter(m => m.won).length,
        losses: matchHistory.filter(m => !m.won).length,
        winRate: matchHistory.length > 0 
          ? Math.round((matchHistory.filter(m => m.won).length / matchHistory.length) * 100)
          : 0
      }
    };

    return NextResponse.json({ success: true, data: playerData });

  } catch (error) {
    console.error('Error fetching player stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch player statistics' },
      { status: 500 }
    );
  }
}
