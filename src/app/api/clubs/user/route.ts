import { NextRequest, NextResponse } from 'next/server';
import { ClubService } from '@/database/services/club.service';
import { Club } from '@/interface/club.interface';
import { BadRequestError } from '@/middleware/errorHandle';

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const clubs  = await ClubService.getUserClubs(userId);
    return NextResponse.json(clubs, { status: 200 });
  } catch (error) {
    if (error instanceof BadRequestError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Error fetching user clubs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}