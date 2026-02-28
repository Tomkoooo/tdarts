import { NextRequest, NextResponse } from 'next/server';
import { TournamentService } from '@/database/services/tournament.service';
import { AuthService } from '@/database/services/auth.service';
import { getRequestLogContext, handleError } from '@/middleware/errorHandle';
import { withApiTelemetry } from '@/lib/api-telemetry';

// POST /api/tournaments/[code]/notifications - Subscribe to tournament notifications
export const POST = withApiTelemetry('/api/tournaments/[code]/notifications', async (
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) => {
  const { code } = await params;
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await AuthService.verifyToken(token);
    const userId = user._id.toString();
    const userEmail = user.email;

    if (!userEmail) {
      return NextResponse.json(
        { error: 'Email address is required for notifications' },
        { status: 400 }
      );
    }

    await TournamentService.subscribeToNotifications(code, userId, userEmail);

    return NextResponse.json({ success: true });
  } catch (error) {
    const context = getRequestLogContext(request, {
      tournamentId: code,
      operation: 'api.tournament.notifications.subscribe',
      entityType: 'tournament',
      entityId: code,
    });
    const { status, body } = handleError(error, context);
    return NextResponse.json({ success: false, ...body }, { status });
  }
});

// DELETE /api/tournaments/[code]/notifications - Unsubscribe from tournament notifications
export const DELETE = withApiTelemetry('/api/tournaments/[code]/notifications', async (
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) => {
  const { code } = await params;
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await AuthService.verifyToken(token);
    const userId = user._id.toString();

    await TournamentService.unsubscribeFromNotifications(code, userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    const context = getRequestLogContext(request, {
      tournamentId: code,
      operation: 'api.tournament.notifications.unsubscribe',
      entityType: 'tournament',
      entityId: code,
    });
    const { status, body } = handleError(error, context);
    return NextResponse.json({ success: false, ...body }, { status });
  }
});

