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

    const { clubId } = await params;
    const club = await ClubService.deactivateClub(clubId, requesterId);
    return NextResponse.json(club, { status: 200 });
  } catch (error) {
    const { status, body } = errorHandle(error);
    return NextResponse.json(body, { status });
  }
}

export const POST = withApiTelemetry('/api/clubs/[clubId]/deactivate', __POST as any);
