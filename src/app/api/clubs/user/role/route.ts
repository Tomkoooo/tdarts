import { NextRequest, NextResponse } from 'next/server';
import { ClubService } from '@/database/services/club.service';
import { BadRequestError } from '@/middleware/errorHandle';

export async function GET(req: NextRequest) {
  try {
    const clubId = req.nextUrl.searchParams.get('clubId');
    const userId = req.nextUrl.searchParams.get('userId');
    if (!clubId || !userId) {
      return NextResponse.json({ error: 'clubId and userId are required' }, { status: 400 });
    }

    const role = await ClubService.getUserRoleInClub(userId, clubId);
    return NextResponse.json({ role }, { status: 200 });
  } catch (error) {
    if (error instanceof BadRequestError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Error fetching user role:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}