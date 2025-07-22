import { NextRequest, NextResponse } from 'next/server';
import { ClubService } from '@/database/services/club.service';
import { BadRequestError } from '@/middleware/errorHandle';

export async function POST(req: NextRequest, { params }: { params: { clubId: string } }) {
  try {
    const { userId, boardNumber, name, description } = await req.json();
    if (!userId || !boardNumber) {
      return NextResponse.json({ error: 'userId and boardNumber are required' }, { status: 400 });
    }
    const club = await ClubService.updateBoard(params.clubId, userId, boardNumber, { name, description });
    return NextResponse.json(club, { status: 200 });
  } catch (error) {
    if (error instanceof BadRequestError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Error editing board:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 