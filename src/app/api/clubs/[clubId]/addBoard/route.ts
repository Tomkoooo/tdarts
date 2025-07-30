import { NextRequest, NextResponse } from 'next/server';
import { ClubService } from '@/database/services/club.service';
import { BadRequestError } from '@/middleware/errorHandle';

export async function POST(req: NextRequest, { params }: { params: Promise<{ clubId: string }> }) {
  try {
    const { userId, name, description } = await req.json();
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }
    const { clubId } = await params;
    const club = await ClubService.addBoard(clubId, userId, { name, description });
    return NextResponse.json(club, { status: 200 });
  } catch (error) {
    if (error instanceof BadRequestError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Error adding board:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 