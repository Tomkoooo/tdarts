import { NextRequest, NextResponse } from 'next/server';
import { ClubService } from '@/database/services/club.service';
import { BadRequestError } from '@/middleware/errorHandle';
import { withApiTelemetry } from '@/lib/api-telemetry';

async function __GET(req: NextRequest) {
  try {
    const query = req.nextUrl.searchParams.get('query');
    if (!query) {
      return NextResponse.json({ error: 'query is required' }, { status: 400 });
    }

    const players = await ClubService.searchUsers(query);
    return NextResponse.json({ players }, { status: 200 });
  } catch (error) {
    if (error instanceof BadRequestError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Error searching users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const GET = withApiTelemetry('/api/clubs/search', __GET as any);
