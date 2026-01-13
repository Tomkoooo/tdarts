import { NextRequest, NextResponse } from 'next/server';
import { ClubService } from '@/database/services/club.service';
import { AuthorizationService } from '@/database/services/authorization.service';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
) {
  try {
    const { clubId } = await params;
    // Publicly accessible
    const club = await ClubService.getClub(clubId);
    
    // Return only necessary info for landing page? 
    // getClub returns a lot, but for now it's fine. 
    // We specifically need landingPage field which should be in the model now.
    
    return NextResponse.json(club);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
) {
  try {
    const userId = await AuthorizationService.getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { clubId } = await params;
    const updates = await req.json();

    // Verify Admin/Moderator permissions
    // Note: ClubService.updateClub checks admin only usually, checking here explicitly
    const isAuthorized = await AuthorizationService.checkAdminOrModerator(userId, clubId);
    if (!isAuthorized) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // We can use ClubService.updateClub but we need to support landingPage updates
    // ClubService.updateClub currently might only support specific fields.
    // We should probably update ClubService to accept landingPage updates 
    // OR handle it directly here if it's specific.
    // Let's assume we updating the model directly via ClubService or a new method.
    // Ideally, we extend ClubService.updateClub.
    
    // For now, I will assume ClubService.updateClub can be updated to handle this, 
    // OR I'll add a specific method for landing page settings.
    // Let's call a new method updateLandingSettings to be clean.
    
    const updatedClub = await ClubService.updateLandingSettings(clubId, userId, updates.landingPage);
    
    return NextResponse.json(updatedClub);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
