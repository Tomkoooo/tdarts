import { NextRequest, NextResponse } from 'next/server';
import { ClubService } from '@/database/services/club.service';
import { errorHandle } from '@/middleware/errorHandle';

export async function GET(req: NextRequest) {
  try {
    const clubId = req.nextUrl.searchParams.get('clubId');
    if (!clubId) {
      return NextResponse.json({ error: 'clubId is required' }, { status: 400 });
    }

    const club = await ClubService.getClub(clubId);
    return NextResponse.json(club, { status: 200 });
  } catch (error) {
    const { status, body } = errorHandle(error);
    return NextResponse.json(body, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId, updates } = await req.json();
    if (!userId || !updates) {
      return NextResponse.json({ error: 'userId and updates are required' }, { status: 400 });
    }

    const club = await ClubService.updateClub(updates._id, userId, updates);
    return NextResponse.json(club, { status: 200 });
  } catch (error) {
    const { status, body } = errorHandle(error);
    return NextResponse.json(body, { status });
  }
}