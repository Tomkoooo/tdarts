import { NextRequest, NextResponse } from 'next/server';
import { ClubService } from '@/database/services/club.service';
import { BadRequestError } from '@/middleware/errorHandle';

export async function POST(req: NextRequest, { params }: { params: { clubId: string } }) {
  try {
    const { requesterId } = await req.json();
    if (!requesterId) {
      return NextResponse.json({ error: 'requesterId is required' }, { status: 400 });
    }

    const club = await ClubService.deactivateClub(params.clubId, requesterId);
    return NextResponse.json(club, { status: 200 });
  } catch (error) {
    if (error instanceof BadRequestError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Error deactivating club:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}