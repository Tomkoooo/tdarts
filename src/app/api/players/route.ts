import { NextRequest, NextResponse } from 'next/server';
import { PlayerService } from '@/database/services/player.service';
import { withApiTelemetry } from '@/lib/api-telemetry';

async function __POST(req: NextRequest) {
  try {
    const data = await req.json();
    const player = await PlayerService.createPlayer(data);
    return NextResponse.json(player, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export const POST = withApiTelemetry('/api/players', __POST as any);
