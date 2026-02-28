import { NextRequest, NextResponse } from 'next/server';
import { LeagueService } from '@/database/services/league.service';
import { withApiTelemetry } from '@/lib/api-telemetry';

// GET /api/clubs/[clubId]/leagues - Get all leagues for a club
async function __GET(
  request: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
) {
  try {
    const { clubId } = await params;

    const url = new URL(request.url);
    const includeInactive = url.searchParams.get('includeInactive') === 'true';

    const leagues = await LeagueService.getClubLeagues(clubId, !includeInactive);
    const oacLeague = leagues.find((l: any) => l.verified)
    return NextResponse.json({  oacLeague });
  } catch (error: any) {
    console.error('Error fetching club leagues:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch leagues' },
      { status: error.statusCode || 500 }
    );
  }
}

export const GET = withApiTelemetry('/api/clubs/[clubId]/leagues/check-oac', __GET as any);
