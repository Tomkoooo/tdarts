import { NextRequest, NextResponse } from 'next/server';
import { LeagueService } from '@/database/services/league.service';
import { FeatureFlagService } from '@/lib/featureFlags';

// GET /api/clubs/[clubId]/leagues/[leagueId]/leaderboard - Get league leaderboard
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clubId: string; leagueId: string }> }
) {
  try {
    const { clubId, leagueId } = await params;

    // Check if leagues feature is enabled
    const leaguesEnabled = await FeatureFlagService.isFeatureEnabled('leagues', clubId);
    if (!leaguesEnabled) {
      return NextResponse.json({ 
        error: 'Leagues feature is not enabled',
        featureDisabled: true 
      }, { status: 403 });
    }

    const leaderboard = await LeagueService.getLeagueLeaderboard(leagueId);

    return NextResponse.json({ leaderboard });
  } catch (error: any) {
    console.error('Error fetching league leaderboard:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch leaderboard' },
      { status: error.statusCode || 500 }
    );
  }
}
