import { NextRequest, NextResponse } from 'next/server';
import { LeagueService } from '@/database/services/league.service';
import { AuthorizationService } from '@/database/services/authorization.service';
import { FeatureFlagService } from '@/lib/featureFlags';
import { AuthService } from '@/database/services/auth.service';
import { withApiTelemetry } from '@/lib/api-telemetry';

// POST /api/clubs/[clubId]/leagues/[leagueId]/detach-tournament - Detach tournament from league
async function __POST(
  request: NextRequest,
  { params }: { params: Promise<{ clubId: string; leagueId: string }> }
) {
  try {
    const { clubId, leagueId } = await params;
    const payload = await request.json();

    // Check if leagues feature is enabled
    const leaguesEnabled = await FeatureFlagService.isFeatureEnabled('leagues', clubId);
    if (!leaguesEnabled) {
      return NextResponse.json({ 
        error: 'Leagues feature is not enabled',
        featureDisabled: true 
      }, { status: 403 });
    }

    // Get user from JWT token
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = await AuthService.verifyToken(token);
    const userId = user._id.toString();

    // Check if user has admin or moderator permissions for this club
    const hasPermission = await AuthorizationService.checkAdminOrModerator(userId, clubId);
    if (!hasPermission) {
      return NextResponse.json({ error: 'Only club admins or moderators can detach tournaments from leagues' }, { status: 403 });
    }

    // Validate payload
    if (!payload.tournamentId) {
      return NextResponse.json({ error: 'Tournament ID is required' }, { status: 400 });
    }

    const league = await LeagueService.detachTournamentFromLeague(
      leagueId, 
      payload.tournamentId, 
      userId
    );

    return NextResponse.json({ 
      league: league.toJSON(),
      message: 'Tournament detached from league successfully and all associated points removed'
    });
  } catch (error: any) {
    console.error('Error detaching tournament from league:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to detach tournament from league' },
      { status: error.statusCode || 500 }
    );
  }
}

export const POST = withApiTelemetry('/api/clubs/[clubId]/leagues/[leagueId]/detach-tournament', __POST as any);
