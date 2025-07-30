import { NextRequest, NextResponse } from 'next/server';
import { ClubService } from '@/database/services/club.service';
import { BadRequestError } from '@/middleware/errorHandle';

export async function POST(req: NextRequest, { params }: { params: Promise<{ clubId: string }> }) {
  try {
    const { playerName, requesterId } = await req.json();
    if (!playerName || !requesterId) {
      return NextResponse.json({ error: 'playerName and requesterId are required' }, { status: 400 });
    }

    const { clubId } = await params;
    const club = await ClubService.addTournamentPlayer(clubId, playerName, requesterId);
    return NextResponse.json(club, { status: 200 });
  } catch (error) {
    if (error instanceof BadRequestError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Error adding tournament player:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}