import { NextRequest, NextResponse } from "next/server";
import { MatchService } from "@/database/services/match.service";
import { withApiTelemetry } from '@/lib/api-telemetry';

async function __POST(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  try {
    const { matchId } = await params;
    
    console.log('=== UNDO LEG API CALL ===');
    console.log('Match ID:', matchId);
    console.log('==========================');
    
    // Call the service method to undo the last leg
    const result = await MatchService.undoLastLeg(matchId);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Last leg undone successfully',
      match: result
    });
  } catch (error: any) {
    console.error('undo-leg error:', error);
    return NextResponse.json({ 
        success: false,
        error: error.message || 'Failed to undo leg' 
    }, { status: 500 });
  }
}

export const POST = withApiTelemetry('/api/matches/[matchId]/undo-leg', __POST as any);
