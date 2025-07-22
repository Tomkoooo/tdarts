import { NextRequest, NextResponse } from 'next/server';
import { ClubModel } from '@/database/models/club.model';
import { ClubService } from '@/database/services/club.service';

export async function POST(req: NextRequest) {
  try {
    const { creatorId, clubData } = await req.json();
    // clubData: { name, description, location, contact, boards, players }
    const club = new ClubModel({
      ...clubData,
      admin: [creatorId],
      members: [creatorId],
      boards: clubData.boards,
      players: clubData.players.map((p: any) => p._id),
    });
    await club.save();
    return NextResponse.json(club, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
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