import { NextRequest, NextResponse } from 'next/server';
import { ClubService } from '@/database/services/club.service';
import { errorHandle } from '@/middleware/errorHandle';
import { withApiTelemetry } from '@/lib/api-telemetry';

async function __POST(req: NextRequest, { params }: { params: Promise<{ clubId: string }> }) {
  try {
    const { AuthorizationService } = await import('@/database/services/authorization.service');
    const requesterId = await AuthorizationService.getUserIdFromRequest(req);
    
    if (!requesterId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { playerName } = await req.json();
    if (!playerName) {
      return NextResponse.json({ error: 'playerName is required' }, { status: 400 });
    }

    const { clubId } = await params;
    const club = await ClubService.addTournamentPlayer(clubId, playerName, requesterId);
    return NextResponse.json(club, { status: 200 });
  } catch (error) {
    const { status, body } = errorHandle(error);
    return NextResponse.json(body, { status });
  }
}

export const POST = withApiTelemetry('/api/clubs/[clubId]/addTournamentPlayer', __POST as any);
