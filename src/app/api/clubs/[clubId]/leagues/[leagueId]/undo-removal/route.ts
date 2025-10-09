import { NextRequest, NextResponse } from 'next/server';
import { LeagueService } from '@/database/services/league.service';
import { AuthService } from '@/database/services/auth.service';
import { AuthorizationService } from '@/database/services/authorization.service';
import { FeatureFlagService } from '@/lib/featureFlags';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clubId: string; leagueId: string }> }
) {
  try {
    const { clubId, leagueId } = await params;
    const { playerId, removalIndex } = await request.json();

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
      return NextResponse.json({ error: 'Only club admins or moderators can undo player removals' }, { status: 403 });
    }

    // Validate payload
    if (!playerId || removalIndex === undefined) {
      return NextResponse.json(
        { error: 'Player ID and removal index are required' },
        { status: 400 }
      );
    }

    const updatedLeague = await LeagueService.undoPlayerRemoval(
      leagueId,
      userId,
      playerId,
      removalIndex
    );

    return NextResponse.json({ success: true, league: updatedLeague });
  } catch (error: any) {
    console.error('Undo player removal error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to undo player removal' },
      { status: error.statusCode || 500 }
    );
  }
}

