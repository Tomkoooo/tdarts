import { NextRequest, NextResponse } from "next/server";
import { MatchModel } from "@/database/models/match.model";
import { BadRequestError } from "@/middleware/errorHandle";
import { withApiTelemetry } from '@/lib/api-telemetry';

async function __GET(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  try {
    const { matchId } = await params;
    
    console.log('=== GET MATCH LEGS API CALL ===');
    console.log('Match ID:', matchId);
    console.log('===============================');
    
    const match = await MatchModel.findById(matchId)
      .populate('player1.playerId')
      .populate('player2.playerId')
      .populate('scorer')
      .populate('legs.winnerId');
      
    if (!match) {
      throw new BadRequestError('Match not found');
    }
    
    return NextResponse.json({ 
      success: true,
      legs: match.legs || [],
      match: {
        _id: match._id,
        player1: match.player1,
        player2: match.player2,
        status: match.status,
        winnerId: match.winnerId
      }
    });
  } catch (error) {
    console.error('get-match-legs error:', error);
    return NextResponse.json({ error: 'Failed to get match legs' }, { status: 500 });
  }
}

export const GET = withApiTelemetry('/api/matches/[matchId]/legs', __GET as any);
