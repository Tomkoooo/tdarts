import { NextRequest, NextResponse } from 'next/server';
import { TournamentService } from '@/database/services/tournament.service';
import { AuthService } from '@/database/services/auth.service';
import { BadRequestError } from '@/middleware/errorHandle';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    
    // Get user from JWT token
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = await AuthService.verifyToken(token);
    const requesterId = user._id.toString();
    
    const body = await request.json();
    const { roundNumber, pairIndex, playerPosition, playerId } = body;

    if (typeof roundNumber !== 'number' || typeof pairIndex !== 'number') {
      return NextResponse.json({ 
        error: 'roundNumber and pairIndex are required' 
      }, { status: 400 });
    }

    if (playerPosition !== 'player1' && playerPosition !== 'player2') {
      return NextResponse.json({ 
        error: 'playerPosition must be player1 or player2' 
      }, { status: 400 });
    }

    const success = await TournamentService.updateKnockoutPairPlayer(
      code,
      requesterId,
      roundNumber,
      pairIndex,
      playerPosition,
      playerId || null
    );

    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ 
        error: 'Failed to update knockout pair' 
      }, { status: 500 });
    }
  } catch (error) {
    if (error instanceof BadRequestError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Error updating knockout pair:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
