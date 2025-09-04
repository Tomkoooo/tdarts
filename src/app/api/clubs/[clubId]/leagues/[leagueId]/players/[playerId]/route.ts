import { NextRequest, NextResponse } from 'next/server';
import { LeagueService } from '@/database/services/league.service';
import { AuthorizationService } from '@/database/services/authorization.service';
import { FeatureFlagService } from '@/lib/featureFlags';
import { AuthService } from '@/database/services/auth.service';

// DELETE /api/clubs/[clubId]/leagues/[leagueId]/players/[playerId] - Remove player from league
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ clubId: string; leagueId: string; playerId: string }> }
) {
  try {
    const { clubId, leagueId, playerId } = await params;

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
      return NextResponse.json({ error: 'Only club admins or moderators can remove players from leagues' }, { status: 403 });
    }

    const league = await LeagueService.removePlayerFromLeague(leagueId, playerId, userId);

    return NextResponse.json({ 
      league: league.toJSON(),
      message: 'Player removed from league successfully' 
    });
  } catch (error: any) {
    console.error('Error removing player from league:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to remove player from league' },
      { status: error.statusCode || 500 }
    );
  }
}
