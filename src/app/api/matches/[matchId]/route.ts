import { NextRequest, NextResponse } from 'next/server';
import { MatchModel } from '@/database/models/match.model';
import { connectMongo } from '@/lib/mongoose';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  try {
    await connectMongo();
    const { matchId } = await params;

    const match = await MatchModel.findById(matchId)
      .populate('player1.playerId', 'name')
      .populate('player2.playerId', 'name')
      .populate('scorer', 'name')

    if (!match) {
      return NextResponse.json({ success: false, error: 'Match not found' }, { status: 404 });
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
