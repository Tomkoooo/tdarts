import { NextRequest, NextResponse } from 'next/server';
import { TournamentService } from '@/database/services/tournament.service';
import { withApiTelemetry } from '@/lib/api-telemetry';

async function __GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const tournamentCode = (await params).code;
    if (!tournamentCode) {
      return NextResponse.json({ success: false, error: 'Tournament code is required' }, { status: 400 });
    }
    // Get board context for the tournament
    const boardContext = await TournamentService.getTournamentBoardContext(tournamentCode);
    
    return NextResponse.json({ 
      success: true, 
      availableBoards: boardContext.availableBoards,
      selectedBoards: boardContext.selectedBoards
    });

  } catch (error: any) {
    console.error('Board context API error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Failed to get board context' 
    }, { status: 500 });
  }
}

export const GET = withApiTelemetry('/api/tournaments/[code]/board-context', __GET as any);
