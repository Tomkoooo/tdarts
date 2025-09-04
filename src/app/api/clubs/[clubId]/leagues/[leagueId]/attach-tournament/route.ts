import { NextRequest, NextResponse } from 'next/server';
import { LeagueService } from '@/database/services/league.service';
import { AuthorizationService } from '@/database/services/authorization.service';
import { FeatureFlagService } from '@/lib/featureFlags';
import { AuthService } from '@/database/services/auth.service';

// POST /api/clubs/[clubId]/leagues/[leagueId]/attach-tournament - Attach tournament to league
export async function POST(
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

    const league = await LeagueService.attachTournamentToLeague(leagueId, payload.tournamentId, userId);

    return NextResponse.json({ 
      league: league.toJSON(),
      message: 'Tournament attached to league successfully' 
    });
  } catch (error: any) {
    console.error('Error attaching tournament to league:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to attach tournament to league' },
      { status: error.statusCode || 500 }
    );
  }
}
