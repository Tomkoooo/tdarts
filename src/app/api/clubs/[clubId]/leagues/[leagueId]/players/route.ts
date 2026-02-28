import { NextRequest, NextResponse } from 'next/server';
import { LeagueService } from '@/database/services/league.service';
import { AuthorizationService } from '@/database/services/authorization.service';
import { AddPlayerToLeagueRequest } from '@/interface/league.interface';
import { FeatureFlagService } from '@/lib/featureFlags';
import { AuthService } from '@/database/services/auth.service';
import { withApiTelemetry } from '@/lib/api-telemetry';

// POST /api/clubs/[clubId]/leagues/[leagueId]/players - Add player to league
async function __POST(
  request: NextRequest,
  { params }: { params: Promise<{ clubId: string; leagueId: string }> }
) {
  try {
    const { clubId, leagueId } = await params;
    const payload: AddPlayerToLeagueRequest = await request.json();

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
      return NextResponse.json({ error: 'Only club admins or moderators can add players to leagues' }, { status: 403 });
    }

    // Validate payload
    if (!payload.playerId) {
      return NextResponse.json({ error: 'Player ID is required' }, { status: 400 });
    }

    const league = await LeagueService.addPlayerToLeague(leagueId, userId, payload);

    return NextResponse.json({ 
      league: league.toJSON(),
      message: 'Player added to league successfully' 
    });
  } catch (error: any) {
    console.error('Error adding player to league:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to add player to league' },
      { status: error.statusCode || 500 }
    );
  }
}

export const POST = withApiTelemetry('/api/clubs/[clubId]/leagues/[leagueId]/players', __POST as any);
