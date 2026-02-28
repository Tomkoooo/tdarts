import { NextRequest, NextResponse } from 'next/server';
import { TournamentService } from '@/database/services/tournament.service';
import { withApiTelemetry } from '@/lib/api-telemetry';

async function __GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    
    // Get all ongoing matches for the tournament
    const liveMatches = await TournamentService.getLiveMatches(code);
    
    return NextResponse.json({
      success: true,
      matches: liveMatches
    });
  } catch (error: any) {
    console.error('Live matches API error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch live matches' },
      { status: 400 }
    );
  }
}

export const GET = withApiTelemetry('/api/tournaments/[code]/live-matches', __GET as any);
