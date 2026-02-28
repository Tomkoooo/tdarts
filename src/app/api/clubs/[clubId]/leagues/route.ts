import { NextRequest, NextResponse } from 'next/server';
import { LeagueService } from '@/database/services/league.service';
import { AuthorizationService } from '@/database/services/authorization.service';
import { CreateLeagueRequest } from '@/interface/league.interface';
import { ClubService } from '@/database/services/club.service';
import { FeatureFlagService } from '@/lib/featureFlags';
import { AuthService } from '@/database/services/auth.service';
import { withApiTelemetry } from '@/lib/api-telemetry';

// GET /api/clubs/[clubId]/leagues - Get all leagues for a club
async function __GET(
  request: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
) {
  try {
    const { clubId } = await params;
    
    // Check if leagues feature is enabled
    const leaguesEnabled = await FeatureFlagService.isFeatureEnabled('leagues', clubId);
    if (!leaguesEnabled) {
      return NextResponse.json({ 
        error: 'Leagues feature is not enabled',
        featureDisabled: true 
      }, { status: 403 });
    }

    const url = new URL(request.url);
    const includeInactive = url.searchParams.get('includeInactive') === 'true';

    const leagues = await LeagueService.getClubLeagues(clubId, !includeInactive);

    return NextResponse.json({ leagues });
  } catch (error: any) {
    console.error('Error fetching club leagues:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch leagues' },
      { status: error.statusCode || 500 }
    );
  }
}

// POST /api/clubs/[clubId]/leagues - Create a new league
async function __POST(
  request: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
) {
  try {
    const { clubId } = await params;
    const payload: CreateLeagueRequest = await request.json();

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
      return NextResponse.json({ error: 'Only club admins or moderators can create leagues' }, { status: 403 });
    }

    // Validate required fields
    if (!payload.name || payload.name.trim().length === 0) {
      return NextResponse.json({ error: 'League name is required' }, { status: 400 });
    }

    if (payload.name.length > 100) {
      return NextResponse.json({ error: 'League name is too long (max 100 characters)' }, { status: 400 });
    }

    // Validate dates if provided
    if (payload.startDate && payload.endDate) {
      const startDate = new Date(payload.startDate);
      const endDate = new Date(payload.endDate);
      
      if (endDate <= startDate) {
        return NextResponse.json({ error: 'End date must be after start date' }, { status: 400 });
      }
    }

    // Get club for validation (subscription check is already handled by feature flag)
    const club = await ClubService.getClub(clubId);
    if (!club) {
      return NextResponse.json({ error: 'Club not found' }, { status: 404 });
    }

    const league = await LeagueService.createLeague(clubId, userId, payload);

    return NextResponse.json({ 
      league: league.toJSON(),
      message: 'League created successfully' 
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating league:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create league' },
      { status: error.statusCode || 500 }
    );
  }
}

export const GET = withApiTelemetry('/api/clubs/[clubId]/leagues', __GET as any);
export const POST = withApiTelemetry('/api/clubs/[clubId]/leagues', __POST as any);
