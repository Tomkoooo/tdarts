import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import { PlayerService } from '@/database/services/player.service';
import { MatchModel } from '@/database/models/match.model';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ playerId: string }> }
) {
  try {
    await connectMongo();
    const { playerId } = await params;

    const player = await PlayerService.findPlayerById(playerId);

    if (!player) {
      return NextResponse.json(
        { success: false, error: 'Player not found' },
        { status: 404 }
      );
    }

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

    const teams = await PlayerService.findTeamsForPlayer(playerId);

    return NextResponse.json({
      success: true,
      player: {
        _id: player._id,
        name: player.name,
        country: player.country || null,
        userRef: player.userRef,
        isRegistered: player.isRegistered,
        stats: player.stats || {},
        tournamentHistory: player.tournamentHistory || [],
        previousSeasons: player.previousSeasons || [],
        honors: player.honors || [],
        type: player.type || 'individual',
        members: player.members || []
      },
      matchHistory,
      teams: teams.map(t => ({
        _id: t._id,
        name: t.name,
        country: t.country || null,
        type: t.type,
        members: t.members,
        stats: t.stats
      }))
    });

  } catch (error) {
    console.error('Error fetching player stats:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
