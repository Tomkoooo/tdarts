import { NextRequest, NextResponse } from "next/server";
import { MatchService } from "@/database/services/match.service";
import { BadRequestError } from "@/middleware/errorHandle";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  try {
    const { matchId } = await params;
    const body = await request.json();
    
    console.log('=== LEG FINISH API CALL ===');
    console.log('Match ID:', matchId);
    console.log('Received data:', JSON.stringify(body, null, 2));
    console.log('==========================');
    
    // Validate required fields (simplified - no stats needed)
    if (body.winner === undefined || body.winner === null) {
      throw new BadRequestError('Missing required field: winner');
    }
    
    if (!Array.isArray(body.player1Throws) || !Array.isArray(body.player2Throws)) {
      throw new BadRequestError('Missing required fields: player1Throws, player2Throws must be arrays');
    }
    
    // Call the service method to finish the leg
    const result = await MatchService.finishLeg(matchId, {
      winner: body.winner,
      player1Throws: body.player1Throws,
      player2Throws: body.player2Throws,
      winnerArrowCount: body.winnerArrowCount,
      legNumber: body.legNumber
    });
    
    return NextResponse.json({ 
      success: true, 
      message: 'Leg finished successfully',
      match: result
    });
  } catch (error) {
    console.error('finish-leg error:', error);
    return NextResponse.json({ error: 'Failed to finish leg' }, { status: 500 });
  }
} 