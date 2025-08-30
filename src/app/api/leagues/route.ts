import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import { LeagueService } from '@/database/services/league.service';
import { AuthService } from '@/database/services/auth.service';
import { ClubService } from '@/database/services/club.service';
import { FeatureFlagService } from '@/lib/featureFlags';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await AuthService.verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const clubId = searchParams.get('clubId');

    if (!clubId) {
      return NextResponse.json({ error: 'Club ID is required' }, { status: 400 });
    }

    // Feature flag ellenőrzés
    const isLeagueEnabled = await FeatureFlagService.isLeagueSystemEnabled(clubId);
    if (!isLeagueEnabled) {
      return NextResponse.json({ error: 'League system is not available for this club' }, { status: 403 });
    }

    // Jogosultság ellenőrzés
    const userRole = await ClubService.getUserRoleInClub(user._id.toString(), clubId);
    if (!userRole || (userRole !== 'admin' && userRole !== 'moderator')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    await connectMongo();
    const leagues = await LeagueService.getLeaguesByClub(clubId);

    return NextResponse.json({ success: true, data: leagues });
  } catch (error) {
    console.error('Error fetching leagues:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await AuthService.verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, clubId, scoringSystem, settings } = body;

    if (!name || !clubId) {
      return NextResponse.json({ error: 'Name and clubId are required' }, { status: 400 });
    }

    // Feature flag ellenőrzés
    const isLeagueEnabled = await FeatureFlagService.isLeagueSystemEnabled(clubId);
    if (!isLeagueEnabled) {
      return NextResponse.json({ error: 'League system is not available for this club' }, { status: 403 });
    }

    // Jogosultság ellenőrzés - csak adminok hozhatnak létre ligát
    const userRole = await ClubService.getUserRoleInClub(user._id.toString(), clubId);
    if (!userRole || userRole !== 'admin') {
      return NextResponse.json({ error: 'Only admins can create leagues' }, { status: 403 });
    }

    await connectMongo();
    const league = await LeagueService.createLeague(
      { name, description, clubId, scoringSystem, settings },
      user._id.toString()
    );

    return NextResponse.json({ success: true, data: league }, { status: 201 });
  } catch (error) {
    console.error('Error creating league:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
