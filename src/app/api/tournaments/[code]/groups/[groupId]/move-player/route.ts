import { NextRequest, NextResponse } from 'next/server';
import { TournamentService } from '@/database/services/tournament.service';
import { AuthorizationService } from '@/database/services/authorization.service';
import { BadRequestError, getRequestLogContext, handleError } from '@/middleware/errorHandle';
import { AuthService } from '@/database/services/auth.service';
import { withApiTelemetry } from '@/lib/api-telemetry';

async function __PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ code: string; groupId: string }> }
) {
  const { code, groupId } = await params;
  try {
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
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const requesterId = user._id.toString();
    const { clubId } = await TournamentService.getTournamentRoleContext(code);
    const hasPermission = await AuthorizationService.checkAdminOrModerator(requesterId, clubId);
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, error: 'Only club admins or moderators can reorder group standings' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { playerId, direction } = body;

    if (!code || !groupId || !playerId || !direction) {
      throw new BadRequestError('Tournament code, group ID, player ID, and direction are required.');
    }

    if (direction !== 'up' && direction !== 'down') {
      throw new BadRequestError('Direction must be either "up" or "down".');
    }

    const result = await TournamentService.movePlayerInGroup(code, groupId, playerId, direction);

    if (result) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ success: false, error: 'Failed to move player' }, { status: 400 });
    }
  } catch (error: any) {
    if (String(error?.message || '').toLowerCase().includes('unauthorized')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (String(error?.message || '').toLowerCase().includes('not found')) {
      return NextResponse.json({ success: false, error: error.message }, { status: 404 });
    }
    if (error instanceof BadRequestError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    const context = getRequestLogContext(request, {
      tournamentId: code,
      operation: 'api.tournament.group.movePlayer',
      entityType: 'tournament',
      entityId: code,
      groupId,
    });
    const { status, body } = handleError(error, context);
    console.warn('[api-error-map]', {
      route: '/api/tournaments/[code]/groups/[groupId]/move-player',
      mappedStatus: status,
      errorType: error?.name || 'unknown_error',
      message: error?.message || String(error),
    });
    return NextResponse.json({ success: false, error: body.error }, { status });
  }
}

export const PATCH = withApiTelemetry('/api/tournaments/[code]/groups/[groupId]/move-player', __PATCH as any);
