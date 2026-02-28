import { NextRequest, NextResponse } from 'next/server';
import { LeagueService } from '@/database/services/league.service';
import { AuthorizationService } from '@/database/services/authorization.service';
import { FeatureFlagService } from '@/lib/featureFlags';
import { AuthService } from '@/database/services/auth.service';
import { withApiTelemetry } from '@/lib/api-telemetry';

// POST /api/clubs/[clubId]/leagues/[leagueId]/attach-tournament - Attach tournament to league
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
      return NextResponse.json({ error: 'Only club admins or moderators can attach tournaments to leagues' }, { status: 403 });
    }

    // Validate payload
    if (!payload.tournamentId) {
      return NextResponse.json({ error: 'Tournament ID is required' }, { status: 400 });
    }

    // calculatePoints defaults to true if not specified
    // Set to false for already finished tournaments to only track averages
    const calculatePoints = payload.calculatePoints !== undefined ? payload.calculatePoints : true;

    const league = await LeagueService.attachTournamentToLeague(
      leagueId, 
      payload.tournamentId, 
      userId,
      calculatePoints
    );

    return NextResponse.json({ 
      league: league.toJSON(),
      message: calculatePoints 
        ? 'Tournament attached to league successfully with points calculation' 
        : 'Tournament attached to league successfully (averages only, no points)'
    });
  } catch (error: any) {
    console.error('Error attaching tournament to league:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to attach tournament to league' },
      { status: error.statusCode || 500 }
    );
  }
}

export const POST = withApiTelemetry('/api/clubs/[clubId]/leagues/[leagueId]/attach-tournament', __POST as any);
