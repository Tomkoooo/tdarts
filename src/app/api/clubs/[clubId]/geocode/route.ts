import { NextRequest, NextResponse } from 'next/server';
import { AuthorizationService } from '@/database/services/authorization.service';
import { ClubService } from '@/database/services/club.service';
import { errorHandle } from '@/middleware/errorHandle';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
) {
  try {
    const requesterId = await AuthorizationService.getUserIdFromRequest(req);
    if (!requesterId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { clubId } = await params;
    const club = await ClubService.requestClubGeocode(clubId, requesterId);
    return NextResponse.json({ club }, { status: 200 });
  } catch (error) {
    const { status, body } = errorHandle(error);
    if (status === 400 && typeof body?.error === 'string' && body.error.includes('cooldown')) {
      return NextResponse.json(body, { status: 429 });
    }
    return NextResponse.json(body, { status });
  }
}
