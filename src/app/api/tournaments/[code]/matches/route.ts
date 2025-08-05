import { NextRequest, NextResponse } from 'next/server';
import { MatchModel } from '@/database/models/match.model';
import { TournamentService } from '@/database/services/tournament.service';
import { BadRequestError } from '@/middleware/errorHandle';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const { searchParams } = new URL(request.url);
    
    // Get optional query parameters
    const boardNumber = searchParams.get('boardNumber');
    const type = searchParams.get('type');
    const round = searchParams.get('round');
    const status = searchParams.get('status');
    
    // Get tournament to verify it exists and get its ID
    const tournament = await TournamentService.getTournament(code);
    if (!tournament) {
      throw new BadRequestError('Tournament not found');
    }
    
    // Build query
    const query: any = {
      tournamentRef: tournament._id
    };
    
    if (boardNumber) {
      query.boardReference = parseInt(boardNumber);
    }
    
    if (type) {
      query.type = type;
    }
    
    if (round) {
      query.round = parseInt(round);
    }
    
    if (status) {
      query.status = status;
    }
    
    // Get matches
    const matches = await MatchModel.find(query)
      .populate('player1.playerId')
      .populate('player2.playerId')
      .populate('scorer')
      .sort({ createdAt: 1 });
    
    return NextResponse.json({ 
      matches: matches,
      count: matches.length,
      tournamentId: code
    });
  } catch (error: any) {
    console.error('getTournamentMatches error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 