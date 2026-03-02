import { NextRequest, NextResponse } from "next/server";
import { MatchService } from "@/database/services/match.service";
import { TournamentService } from "@/database/services/tournament.service";
import { withApiTelemetry } from '@/lib/api-telemetry';

async function __GET(
  request: NextRequest,
  { params }: { params: Promise<{ tournamentId: string; boardNumber: string }> }
) {
  try {
    const { tournamentId, boardNumber } = await params;
    const context = await TournamentService.getTournamentMatchContext(tournamentId);
    const boardNum = parseInt(boardNumber);

    // Use MatchService to get all matches for the board
    const matches = await MatchService.getBoardMatches(
      tournamentId,
      context.clubId,
      boardNum,
      {
        tournamentObjectId: context.tournamentObjectId,
        startingScore: context.startingScore,
      }
    );

    return NextResponse.json({ matches });
    } catch (error) {
        console.error('getBoardMatches error:', error);
        return NextResponse.json({ error: 'Failed to get matches' }, { status: 500 });
    }
}

export const GET = withApiTelemetry('/api/boards/[tournamentId]/[boardNumber]/matches', __GET as any);
