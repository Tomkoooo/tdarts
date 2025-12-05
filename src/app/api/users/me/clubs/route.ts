import { NextRequest, NextResponse } from 'next/server';
import { ClubService } from '@/database/services/club.service';
import { AuthorizationService } from '@/database/services/authorization.service';
import { BadRequestError } from '@/middleware/errorHandle';

export async function GET(req: NextRequest) {
  try {
    const userId = await AuthorizationService.getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { clubs } = await ClubService.getUserClubs(userId);
    
    // Return simplified club data
    const simplifiedClubs = clubs.map(club => ({
      _id: club._id,
      name: club.name,
      description: club.description,
      location: club.location,
      role: club.admin.includes(userId as any) ? 'admin' : 
            club.moderators.includes(userId as any) ? 'moderator' : 'member'
    }));

    return NextResponse.json({ clubs: simplifiedClubs }, { status: 200 });
  } catch (error) {
    if (error instanceof BadRequestError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Error fetching user clubs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
