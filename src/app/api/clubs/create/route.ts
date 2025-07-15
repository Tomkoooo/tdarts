import { NextRequest, NextResponse } from 'next/server';
import { ClubService } from '@/database/services/club.service';
import { BadRequestError } from '@/middleware/errorHandle';

export async function POST(req: NextRequest) {
  try {
    const { creatorId, clubData } = await req.json();
    if (!creatorId || !clubData) {
      return NextResponse.json(
        { error: 'creatorId and clubData are required' },
        { status: 400 }
      );
    }

    const club = await ClubService.createClub(creatorId, clubData);
    return NextResponse.json(club, { status: 201 });
  } catch (error) {
    if (error instanceof BadRequestError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Error creating club:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
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