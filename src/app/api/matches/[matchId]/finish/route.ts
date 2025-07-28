import { NextRequest, NextResponse } from "next/server";
import { MatchService } from "@/database/services/match.service";
import { BadRequestError } from "@/middleware/errorHandle";

export async function POST(request: NextRequest, { params }: { params: { matchId: string } }) {
  try {
    const { matchId } = params;
    const body = await request.json();
    
    console.log('=== MATCH FINISH API CALL ===');
    console.log('Match ID:', matchId);
    console.log('Received data:', JSON.stringify(body, null, 2));
    console.log('=============================');
    
    // Validate required fields
    if (body.player1LegsWon === undefined || body.player1LegsWon === null ||
        body.player2LegsWon === undefined || body.player2LegsWon === null ||
        !body.player1Stats || !body.player2Stats) {
      throw new BadRequestError('Missing required fields: player1LegsWon, player2LegsWon, player1Stats, player2Stats');
    }
    
    // Call the service method to finish the match
    const result = await MatchService.finishMatch(matchId, {
      player1LegsWon: body.player1LegsWon,
      player2LegsWon: body.player2LegsWon,
      player1Stats: body.player1Stats,
      player2Stats: body.player2Stats
    });
    
    return NextResponse.json({ 
      success: true, 
      message: 'Match finished successfully',
      match: result
    });
  } catch (error) {
    console.error('finish match error:', error);
    return NextResponse.json({ error: 'Failed to finish match' }, { status: 500 });
  }
} 