import { NextRequest, NextResponse } from 'next/server';
import { TournamentService } from '@/database/services/tournament.service';
import { AuthService } from '@/database/services/auth.service';
import { getRequestLogContext, handleError } from '@/middleware/errorHandle';
import { withApiTelemetry } from '@/lib/api-telemetry';

async function __POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  try {
    if (!code) {
      return NextResponse.json(
        { success: false, error: 'Tournament code is required' },
        { status: 400 }
      );
    }

    // Get user from JWT token
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    let user;
    try {
      user = await AuthService.verifyToken(token);
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const requesterId = user._id.toString();

    const body = await request.json().catch(() => ({}));
    const { thirdPlacePlayerId } = body;

    const result = await TournamentService.finishTournament(code, requesterId, thirdPlacePlayerId);

    if (result) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { success: false, error: 'Nem sikerült befejezni a tornát' },
        { status: 400 }
      );
    }
  } catch (error) {
    const context = getRequestLogContext(request, {
      tournamentId: code,
      operation: 'api.tournament.finish',
      entityType: 'tournament',
      entityId: code,
    });
    const { status, body } = handleError(error, context);
    console.warn('[api-error-map]', {
      route: '/api/tournaments/[code]/finish',
      mappedStatus: status,
      errorType: (error as any)?.name || 'unknown_error',
      message: (error as any)?.message || String(error),
    });
    return NextResponse.json({ success: false, error: body.error }, { status });
  }
}

export const POST = withApiTelemetry('/api/tournaments/[code]/finish', __POST as any);
