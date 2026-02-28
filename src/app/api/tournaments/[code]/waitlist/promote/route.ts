import { NextRequest, NextResponse } from 'next/server';
import { TournamentService } from '@/database/services/tournament.service';
import { AuthService } from '@/database/services/auth.service';
import { AuthorizationService } from '@/database/services/authorization.service';
import { withApiTelemetry } from '@/lib/api-telemetry';

// POST /api/tournaments/[code]/waitlist/promote - Move player from waiting list to tournament
async function __POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const { playerId } = await request.json();

    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await AuthService.verifyToken(token);
    const userId = user._id.toString();

    // Check if user is admin or moderator
    const tournament = await TournamentService.getTournament(code);
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
    console.error('Promote from waiting list error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to promote from waiting list' },
      { status: error.statusCode || 500 }
    );
  }
}

export const POST = withApiTelemetry('/api/tournaments/[code]/waitlist/promote', __POST as any);
