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
      // This would return all active matches
      // For now, return empty array
      return NextResponse.json({ 
        success: true, 
        matches: [] 
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