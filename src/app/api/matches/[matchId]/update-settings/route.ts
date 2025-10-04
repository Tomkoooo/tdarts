import { NextRequest, NextResponse } from 'next/server';
import { MatchService } from '@/database/services/match.service';
import { AuthService } from '@/database/services/auth.service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  try {
    const matchId = (await params).matchId;
    const body = await request.json();
    
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 });
    }
    
    const user = await AuthService.verifyToken(token);
    const requesterId = user._id.toString();

    if (!matchId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Match ID is required' 
      }, { status: 400 });
    }

    // Validate required fields
    const { player1Id, player2Id, scorerId, boardNumber } = body;

    // At least one field must be provided
    if (!player1Id && !player2Id && !scorerId && !boardNumber) {
      return NextResponse.json({ 
        success: false, 
        error: 'At least one field must be provided for update' 
      }, { status: 400 });
    }

    // Validate board number if provided
    if (boardNumber && (typeof boardNumber !== 'number' || boardNumber < 1)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Board number must be a positive integer' 
      }, { status: 400 });
    }

    const result = await MatchService.updateMatchSettings(matchId, requesterId, {
      player1Id,
      player2Id,
      scorerId,
      boardNumber
    });

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Update match settings API error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Failed to update match settings' 
    }, { status: 500 });
  }
}
