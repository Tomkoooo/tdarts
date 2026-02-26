import { NextRequest, NextResponse } from 'next/server';
import { MatchModel } from '@/database/models/match.model';
import { connectMongo } from '@/lib/mongoose';
import { eventEmitter, EVENTS } from '@/lib/events';
import { AuthService } from '@/database/services/auth.service';
import { PlayerModel } from '@/database/models/player.model';
import { TournamentModel } from '@/database/models/tournament.model';
import { AuthorizationService } from '@/database/services/authorization.service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  try {
    await connectMongo();
    const { matchId } = await params;
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const match = await MatchModel.findById(matchId)
      .populate('player1.playerId', 'name')
      .populate('player2.playerId', 'name')
      .populate('scorer', 'name')

    if (!match) {
      return NextResponse.json({ success: false, error: 'Match not found' }, { status: 404 });
    }

    const user = await AuthService.verifyToken(token);
    const tournament = await TournamentModel.findById(match.tournamentRef).select('clubId');
    if (!tournament) {
      return NextResponse.json({ success: false, error: 'Tournament not found' }, { status: 404 });
    }

    const canModerate = await AuthorizationService.checkAdminOrModerator(user._id.toString(), tournament.clubId.toString());
    const basePlayers = await PlayerModel.find({ userRef: user._id }).select('_id');
    const baseIds = basePlayers.map((p) => p._id);
    const teamPlayers = baseIds.length
      ? await PlayerModel.find({ members: { $in: baseIds } }).select('_id')
      : [];
    const userPlayerIds = new Set([...basePlayers, ...teamPlayers].map((p) => p._id.toString()));
    const player1Id = (match.player1?.playerId as any)?._id?.toString() || (match.player1?.playerId as any)?.toString();
    const player2Id = (match.player2?.playerId as any)?._id?.toString() || (match.player2?.playerId as any)?.toString();
    const canViewByParticipation = userPlayerIds.has(player1Id) || userPlayerIds.has(player2Id);

    if (!canModerate && !canViewByParticipation) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    // Transform the data for the frontend
    const transformedMatch = {
      _id: match._id,
      boardReference: match.boardReference,
      type: match.type,
      round: match.round,
      player1: match.player1,
      player2: match.player2,
      scorer: match.scorer,
      legsToWin: match.legsToWin,
      startingPlayer: match.startingPlayer,
      status: match.status,
      winnerId: match.winnerId,
      legs: match.legs || [],
      tournamentRef: match.tournamentRef,
      createdAt: match.createdAt,
      updatedAt: match.updatedAt
    };

    return NextResponse.json({ success: true, match: transformedMatch });
  } catch (error) {
    console.error('Error fetching match:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  try {
    await connectMongo();
    const { matchId } = await params;
    const body = await request.json();

    const match = await MatchModel.findById(matchId).populate('tournamentRef');
    if (!match) {
      return NextResponse.json({ success: false, error: 'Match not found' }, { status: 404 });
    }

    // Only allow updating legsToWin if match is ongoing
    if (match.status !== 'ongoing') {
      return NextResponse.json({ success: false, error: 'Can only update ongoing matches' }, { status: 400 });
    }

    if (body.legsToWin !== undefined) {
      if (body.legsToWin < 1 || body.legsToWin > 20) {
        return NextResponse.json({ success: false, error: 'LegsToWin must be between 1 and 20' }, { status: 400 });
      }
      match.legsToWin = body.legsToWin;
    }

    await match.save();

    // Emit match update event
    const tournament = match.tournamentRef as any;
    if (tournament?.tournamentId) {
      eventEmitter.emit(EVENTS.MATCH_UPDATE, {
        tournamentId: tournament.tournamentId,
        matchId,
        match: match.toObject(),
        type: 'updated'
      });
    }

    return NextResponse.json({ success: true, match });
  } catch (error) {
    console.error('Error updating match:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
