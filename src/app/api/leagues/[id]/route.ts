import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import { LeagueService } from '@/database/services/league.service';
import { AuthService } from '@/database/services/auth.service';
import { ClubService } from '@/database/services/club.service';
import { FeatureFlagService } from '@/lib/featureFlags';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await AuthService.verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectMongo();
    const league = await LeagueService.getLeagueById(params.id);

    if (!league) {
      return NextResponse.json({ error: 'League not found' }, { status: 404 });
    }

    // Feature flag ellenőrzés
    const isLeagueEnabled = await FeatureFlagService.isLeagueSystemEnabled(league.clubId.toString());
    if (!isLeagueEnabled) {
      return NextResponse.json({ error: 'League system is not available for this club' }, { status: 403 });
    }

    // Jogosultság ellenőrzés
    const userRole = await ClubService.getUserRoleInClub(user._id.toString(), league.clubId.toString());
    if (!userRole || (userRole !== 'admin' && userRole !== 'moderator')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    return NextResponse.json({ success: true, data: league });
  } catch (error) {
    console.error('Error fetching league:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await AuthorizationService.verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, isActive, scoringSystem, settings } = body;

    await connectMongo();
    const existingLeague = await LeagueService.getLeagueById(params.id);

    if (!existingLeague) {
      return NextResponse.json({ error: 'League not found' }, { status: 404 });
    }

    // Feature flag ellenőrzés
    const isLeagueEnabled = await FeatureFlagService.isLeagueSystemEnabled(existingLeague.clubId.toString());
    if (!isLeagueEnabled) {
      return NextResponse.json({ error: 'League system is not available for this club' }, { status: 403 });
    }

    // Jogosultság ellenőrzés - csak adminok szerkeszthetnek ligát
    const userRole = await ClubService.getUserRoleInClub(user._id.toString(), existingLeague.clubId.toString());
    if (!userRole || userRole !== 'admin') {
      return NextResponse.json({ error: 'Only admins can edit leagues' }, { status: 403 });
    }

    const updatedLeague = await LeagueService.updateLeague(params.id, {
      name,
      description,
      isActive,
      scoringSystem,
      settings
    });

    if (!updatedLeague) {
      return NextResponse.json({ error: 'Failed to update league' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: updatedLeague });
  } catch (error) {
    console.error('Error updating league:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await AuthorizationService.verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectMongo();
    const existingLeague = await LeagueService.getLeagueById(params.id);

    if (!existingLeague) {
      return NextResponse.json({ error: 'League not found' }, { status: 404 });
    }

    // Feature flag ellenőrzés
    const isLeagueEnabled = await FeatureFlagService.isLeagueSystemEnabled(existingLeague.clubId.toString());
    if (!isLeagueEnabled) {
      return NextResponse.json({ error: 'League system is not available for this club' }, { status: 403 });
    }

    // Jogosultság ellenőrzés - csak adminok törölhetnek ligát
    const userRole = await ClubService.getUserRoleInClub(user._id.toString(), existingLeague.clubId.toString());
    if (!userRole || userRole !== 'admin') {
      return NextResponse.json({ error: 'Only admins can delete leagues' }, { status: 403 });
    }

    const success = await LeagueService.deleteLeague(params.id);

    if (!success) {
      return NextResponse.json({ error: 'Failed to delete league' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'League deleted successfully' });
  } catch (error) {
    console.error('Error deleting league:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
