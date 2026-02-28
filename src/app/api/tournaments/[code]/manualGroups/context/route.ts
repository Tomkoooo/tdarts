import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import { TournamentService } from '@/database/services/tournament.service';
import { withApiTelemetry } from '@/lib/api-telemetry';

async function __GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    await connectMongo();
    const { code } = await params;
    const ctx = await TournamentService.getManualGroupsContext(code);

    return NextResponse.json({ success: true, ...ctx });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export const GET = withApiTelemetry('/api/tournaments/[code]/manualGroups/context', __GET as any);
