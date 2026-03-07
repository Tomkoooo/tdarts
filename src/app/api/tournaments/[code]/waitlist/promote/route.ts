import { NextRequest, NextResponse } from 'next/server';
import { TournamentService } from '@/database/services/tournament.service';
import { AuthService } from '@/database/services/auth.service';
import { AuthorizationService } from '@/database/services/authorization.service';
import { BadRequestError, getRequestLogContext, handleError } from '@/middleware/errorHandle';
import { withApiTelemetry } from '@/lib/api-telemetry';

// POST /api/tournaments/[code]/waitlist/promote - Move player from waiting list to tournament
async function __POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  try {
    const { playerId } = await request.json();
    if (!playerId) {
      throw new BadRequestError('playerId is required');
    }

    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let user;
    try {
      user = await AuthService.verifyToken(token);
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = user._id.toString();

    // Check if user is admin or moderator
    const tournament = await TournamentService.getTournament(code);
    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }
    const clubId = tournament.clubId._id?.toString() || tournament.clubId.toString();
    
    const hasPermission = await AuthorizationService.checkAdminOrModerator(userId, clubId);
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Only club admins or moderators can promote players from waiting list' },
        { status: 403 }
      );
    }

    await TournamentService.promoteFromWaitingList(code, playerId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (String(error?.message || '').toLowerCase().includes('not found')) {
      return NextResponse.json({ success: false, error: error.message }, { status: 404 });
    }
    if (error instanceof BadRequestError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    const context = getRequestLogContext(request, {
      tournamentId: code,
      operation: 'api.tournament.waitlist.promote',
      entityType: 'tournament',
      entityId: code,
    });
    const { status, body } = handleError(error, context);
    console.warn('[api-error-map]', {
      route: '/api/tournaments/[code]/waitlist/promote',
      mappedStatus: status,
      errorType: error?.name || 'unknown_error',
      message: error?.message || String(error),
    });
    return NextResponse.json(
      { success: false, error: body.error || 'Failed to promote from waiting list' },
      { status }
    );
  }
}

export const POST = withApiTelemetry('/api/tournaments/[code]/waitlist/promote', __POST as any);
