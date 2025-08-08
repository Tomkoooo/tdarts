import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    success: true, 
    message: 'Socket.IO endpoint ready',
    timestamp: new Date().toISOString()
  });
}

export async function POST(req: NextRequest) {
  try {
    const { action, matchId } = await req.json();
    
    if (action === 'get-match-state') {
      if (!matchId) {
        return NextResponse.json({ 
          success: false, 
          error: 'Match ID is required' 
        }, { status: 400 });
      }
      
      // Access global match states from server.js
      const matchStates = (global as any).matchStates;
      const state = matchStates?.get(matchId);
      
      return NextResponse.json({ 
        success: true, 
        state: state || null 
      });
    }
    
    if (action === 'get-live-matches') {
      // Get live matches from server memory
      const matchStates = (global as any).matchStates;
      const liveMatches = Array.from(matchStates.entries() as Iterable<[string, any]>).map(([matchId, state]) => ({
        _id: matchId,
        currentLeg: state.currentLeg,
        player1Remaining: state.currentLegData.player1Remaining,
        player2Remaining: state.currentLegData.player2Remaining,
        player1Id: state.currentLegData.player1Id,
        player2Id: state.currentLegData.player2Id,
        player1Name: state.player1Name || 'Player 1',
        player2Name: state.player2Name || 'Player 2',
        player1LegsWon: state.player1LegsWon || 0,
        player2LegsWon: state.player2LegsWon || 0,
        status: 'ongoing'
      }));
      
      return NextResponse.json({ 
        success: true, 
        matches: liveMatches 
      });
    }
    
    return NextResponse.json({ 
      success: false, 
      error: 'Invalid action' 
    }, { status: 400 });
    
  } catch (error: any) {
    console.error('Socket API error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
} 