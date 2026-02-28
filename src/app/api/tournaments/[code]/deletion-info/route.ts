import { NextRequest, NextResponse } from "next/server";
import { TournamentService } from "@/database/services/tournament.service";
import { BadRequestError } from "@/middleware/errorHandle";
import { withApiTelemetry } from '@/lib/api-telemetry';

async function __GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const info = await TournamentService.getTournamentDeletionInfo(code);
    return NextResponse.json(info);
  } catch (error) {
    if (error instanceof BadRequestError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Error getting tournament deletion info:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export const GET = withApiTelemetry('/api/tournaments/[code]/deletion-info', __GET as any);
