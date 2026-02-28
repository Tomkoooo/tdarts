import { NextRequest, NextResponse } from 'next/server';
import { LeagueService } from '@/database/services/league.service';
import { AuthorizationService } from '@/database/services/authorization.service';
import { ManualPointsAdjustmentRequest } from '@/interface/league.interface';
import { FeatureFlagService } from '@/lib/featureFlags';
import { AuthService } from '@/database/services/auth.service';
import { withApiTelemetry } from '@/lib/api-telemetry';

// POST /api/clubs/[clubId]/leagues/[leagueId]/adjust-points - Manually adjust player points
async function __POST(
  request: NextRequest,
  { params }: { params: Promise<{ clubId: string; leagueId: string }> }
) {
  try {
    const { clubId, leagueId } = await params;
    const payload: ManualPointsAdjustmentRequest = await request.json();

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
      return NextResponse.json({ error: 'Only club admins or moderators can adjust points' }, { status: 403 });
    }

    // Validate payload
    if (!payload.playerId) {
      return NextResponse.json({ error: 'Player ID is required' }, { status: 400 });
    }

    if (typeof payload.pointsAdjustment !== 'number') {
      return NextResponse.json({ error: 'Points adjustment must be a number' }, { status: 400 });
    }

    if (!payload.reason || payload.reason.trim().length === 0) {
      return NextResponse.json({ error: 'Reason for adjustment is required' }, { status: 400 });
    }

    if (payload.reason.length > 500) {
      return NextResponse.json({ error: 'Reason is too long (max 500 characters)' }, { status: 400 });
    }

    // Prevent excessive adjustments
    if (Math.abs(payload.pointsAdjustment) > 1000) {
      return NextResponse.json({ error: 'Points adjustment cannot exceed ±1000 points' }, { status: 400 });
    }

    const league = await LeagueService.adjustPlayerPoints(leagueId, userId, payload);

    return NextResponse.json({ 
      league: league.toJSON(),
      message: 'Player points adjusted successfully' 
    });
  } catch (error: any) {
    console.error('Error adjusting player points:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to adjust player points' },
      { status: error.statusCode || 500 }
    );
  }
}

export const POST = withApiTelemetry('/api/clubs/[clubId]/leagues/[leagueId]/adjust-points', __POST as any);
