import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import { PlayerModel } from '@/database/models/player.model';
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
      if (mmr >= 1200) return { name: 'Elit', color: 'text-error' };
      if (mmr >= 1100) return { name: 'Mester', color: 'text-warning' };
      if (mmr >= 1000) return { name: 'Haladó', color: 'text-info' };
      if (mmr >= 900) return { name: 'Középhaladó', color: 'text-success' };
      if (mmr >= 800) return {name: "Átlagos", color: "text-primary"}
      if (mmr < 800) return { name: 'Kezdő+', color: 'text-primary' };
      return { name: 'Kezdő', color: 'text-base-content' };
    };

    // Use player.tournamentHistory directly (same as PlayerStatsModal)
    const tournamentHistory = (player.tournamentHistory || []).map((history: any) => ({
      _id: history.tournamentId, // Use tournamentId as _id for consistency
      tournamentId: history.tournamentId,
      name: history.tournamentName,
      startDate: history.date,
      status: 'finished', // tournamentHistory only contains finished tournaments
      stats: {
        matchesWon: history.stats.matchesWon || 0,
        matchesLost: history.stats.matchesLost || 0,
        legsWon: history.stats.legsWon || 0,
        legsLost: history.stats.legsLost || 0,
        oneEightiesCount: history.stats.oneEightiesCount || 0,
        highestCheckout: history.stats.highestCheckout || 0,
        average: history.stats.average || 0
      },
      finalPosition: history.position,
      mmrChange: history.mmrChange,
      oacMmrChange: history.oacMmrChange,
      isVerified: history.isVerified
    }));

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
      const p1Id = match.player1?.playerId?._id?.toString() || match.player1?.playerId?.toString();
      const isPlayer1 = p1Id === player._id.toString();
      const opponent = isPlayer1 ? match.player2 : match.player1;
      const playerData = isPlayer1 ? match.player1 : match.player2;
      
      return {
        _id: match._id,
        opponent: opponent?.playerId?.name || 'Ismeretlen',
        player1Score: match.player1?.legsWon || 0,
        player2Score: match.player2?.legsWon || 0,
        won: (playerData?.legsWon || 0) > (isPlayer1 ? (match.player2?.legsWon || 0) : (match.player1?.legsWon || 0)),
        date: match.createdAt,
        legs: match.legs?.length || 0
      };
    });

    // Ensure stats has mmr field (same as search service)
    const stats = { ...playerStats };
    stats.mmr = mmr;

    const playerData = {
      hasPlayer: true,
      player: {
        _id: player._id,
        name: player.name,
        type: 'player',
        userRef: player.userRef,
        stats: stats,
        tournamentHistory: player.tournamentHistory || [],
        mmr: mmr,
        mmrTier: getMMRTier(mmr),
        globalRank: globalRank,
        previousSeasons: player.previousSeasons || [],
        honors: player.honors || []
      },
      tournamentHistory,
      matchHistory,
 
      summary: {
        totalTournaments: tournamentHistory.length,
        totalMatches: matchHistory.length,
        wins: player.stats.totalMatchesWon,
        losses: player.stats.totalMatchesLost,
        winRate: player.stats.totalMatchesWon > 0 ? Math.round((player.stats.totalMatchesWon / (player.stats.totalMatchesWon + player.stats.totalMatchesLost)) * 100) : 0,
        totalLegsWon: player.stats.totalLegsWon,
        totalLegsLost: player.stats.totalLegsLost,
        legWinRate: player.stats.totalLegsWon > 0 ? Math.round((player.stats.totalLegsWon / (player.stats.totalLegsWon + player.stats.totalLegsLost)) * 100) : 0,
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
