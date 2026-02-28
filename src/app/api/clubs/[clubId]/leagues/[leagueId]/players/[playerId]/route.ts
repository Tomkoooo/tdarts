import { NextRequest, NextResponse } from 'next/server';
import { LeagueService } from '@/database/services/league.service';
import { AuthService } from '@/database/services/auth.service';
import { AuthorizationService } from '@/database/services/authorization.service';
import { FeatureFlagService } from '@/lib/featureFlags';
import { withApiTelemetry } from '@/lib/api-telemetry';

async function __DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ clubId: string; leagueId: string; playerId: string }> }
) {
  try {
    const { clubId, leagueId, playerId } = await params;
    const { reason } = await request.json();

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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await AuthService.verifyToken(token);
    const userId = user._id.toString();

    // Check if user has admin or moderator permissions for this club
    const hasPermission = await AuthorizationService.checkAdminOrModerator(userId, clubId);
    if (!hasPermission) {
      return NextResponse.json({ error: 'Only club admins or moderators can remove players from leagues' }, { status: 403 });
    }

    // Validate payload
    if (!reason || !reason.trim()) {
      return NextResponse.json(
        { error: 'Az eltávolítás oka kötelező' },
        { status: 400 }
      );
    }

    const updatedLeague = await LeagueService.removePlayerFromLeague(
      leagueId,
      userId,
      playerId,
      reason
    );

    return NextResponse.json({ success: true, league: updatedLeague });
  } catch (error: any) {
    console.error('Remove player from league error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to remove player from league' },
      { status: error.statusCode || 500 }
    );
  }
}

export const DELETE = withApiTelemetry('/api/clubs/[clubId]/leagues/[leagueId]/players/[playerId]', __DELETE as any);
