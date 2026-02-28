import { NextRequest, NextResponse } from 'next/server';
import { LeagueService } from '@/database/services/league.service';
import { AuthorizationService } from '@/database/services/authorization.service';
import { UpdateLeagueRequest } from '@/interface/league.interface';
import { FeatureFlagService } from '@/lib/featureFlags';
import { AuthService } from '@/database/services/auth.service';
import { withApiTelemetry } from '@/lib/api-telemetry';

// GET /api/clubs/[clubId]/leagues/[leagueId] - Get league details with stats
async function __GET(
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

    const leagueStats = await LeagueService.getLeagueStats(leagueId);

    return NextResponse.json(leagueStats);
  } catch (error: any) {
    console.error('Error fetching league stats:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch league' },
      { status: error.statusCode || 500 }
    );
  }
}

// PUT /api/clubs/[clubId]/leagues/[leagueId] - Update league
async function __PUT(
  request: NextRequest,
  { params }: { params: Promise<{ clubId: string; leagueId: string }> }
) {
  try {
    const { clubId, leagueId } = await params;
    const payload: UpdateLeagueRequest = await request.json();

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
      return NextResponse.json({ error: 'Only club admins or moderators can update leagues' }, { status: 403 });
    }

    // Validate fields if provided
    if (payload.name !== undefined) {
      if (!payload.name || payload.name.trim().length === 0) {
        return NextResponse.json({ error: 'League name cannot be empty' }, { status: 400 });
      }
      if (payload.name.length > 100) {
        return NextResponse.json({ error: 'League name is too long (max 100 characters)' }, { status: 400 });
      }
    }

    // Validate dates if provided
    if (payload.startDate && payload.endDate) {
      const startDate = new Date(payload.startDate);
      const endDate = new Date(payload.endDate);
      
      if (endDate <= startDate) {
        return NextResponse.json({ error: 'End date must be after start date' }, { status: 400 });
      }
    }

    const league = await LeagueService.updateLeague(leagueId, userId, payload);

    return NextResponse.json({ 
      league: league.toJSON(),
      message: 'League updated successfully' 
    });
  } catch (error: any) {
    console.error('Error updating league:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update league' },
      { status: error.statusCode || 500 }
    );
  }
}

// DELETE /api/clubs/[clubId]/leagues/[leagueId] - Soft delete league
async function __DELETE(
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
      return NextResponse.json({ error: 'Only club admins or moderators can delete leagues' }, { status: 403 });
    }

    await LeagueService.deleteLeague(leagueId, userId);

    return NextResponse.json({ message: 'League deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting league:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete league' },
      { status: error.statusCode || 500 }
    );
  }
}

export const GET = withApiTelemetry('/api/clubs/[clubId]/leagues/[leagueId]', __GET as any);
export const PUT = withApiTelemetry('/api/clubs/[clubId]/leagues/[leagueId]', __PUT as any);
export const DELETE = withApiTelemetry('/api/clubs/[clubId]/leagues/[leagueId]', __DELETE as any);
