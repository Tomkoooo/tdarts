import { NextRequest, NextResponse } from 'next/server';
import { ClubService } from '@/database/services/club.service';
import { AuthorizationService } from '@/database/services/authorization.service';
import { BadRequestError } from '@/middleware/errorHandle';
import { withApiTelemetry } from '@/lib/api-telemetry';

async function __POST(req: NextRequest) {
  try {
    const { creatorId, clubData } = await req.json();

    // Security check:
    // 1. Allow if valid internal secret is provided
    const internalSecret = req.headers.get('x-internal-secret');
    const expectedSecret = process.env.INTERNAL_API_SECRET || 'development-secret-change-in-production';
    const isInternalRequest = internalSecret === expectedSecret;

    // 2. Allow if valid user session and creatorId matches user
    let isAuthorizedUser = false;
    if (!isInternalRequest) {
      const authUserId = await AuthorizationService.getUserIdFromRequest(req);
      if (authUserId && authUserId === creatorId) {
        isAuthorizedUser = true;
      }
    }

    if (!isInternalRequest && !isAuthorizedUser) {
      return NextResponse.json({ error: 'Unauthorized - Invalid credentials or session' }, { status: 401 });
    }
    
    // Validate required fields
    if (!creatorId) {
      return NextResponse.json({ error: 'creatorId is required' }, { status: 400 });
    }
    if (!clubData || !clubData.name || !clubData.description || !clubData.location) {
      return NextResponse.json({ error: 'name, description, and location are required' }, { status: 400 });
    }
    
    // Use ClubService.createClub - boards and players are handled at tournament level
    const club = await ClubService.createClub(creatorId, {
      name: clubData.name,
      description: clubData.description,
      location: clubData.location,
      contact: clubData.contact || {},
    });
    
    return NextResponse.json(club, { status: 201 });
  } catch (error: any) {
    if (error instanceof BadRequestError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Club creation error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

async function __GET(req: NextRequest) {
    try {
        const clubId = req.nextUrl.searchParams.get('clubId');
        if (!clubId) {
        return NextResponse.json(
            { error: 'clubId is required' },
            { status: 400 }
        );
        }
    
        const club = await ClubService.getClub(clubId);
        if (!club) {
        return NextResponse.json(
            { error: 'Club not found' },
            { status: 404 }
        );
        }
        
        return NextResponse.json(club, { status: 200 });
    } catch (error) {
        console.error('Error fetching club:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
    }

export const POST = withApiTelemetry('/api/clubs/create', __POST as any);
export const GET = withApiTelemetry('/api/clubs/create', __GET as any);
