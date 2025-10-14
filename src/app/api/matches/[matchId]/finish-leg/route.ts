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
    
    // Validate required fields
    if (body.winner === undefined || body.winner === null ||
        !body.player1Stats || !body.player2Stats) {
      throw new BadRequestError('Missing required fields: winner, player1Stats, player2Stats');
    }
    
    // Call the service method to finish the leg
    const result = await MatchService.finishLeg(matchId, {
      winner: body.winner,
      player1Throws: body.player1Throws || [],
      player2Throws: body.player2Throws || [],
      winnerArrowCount: body.winnerArrowCount,
      player1Stats: body.player1Stats,
      player2Stats: body.player2Stats
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