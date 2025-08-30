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

    // Jogosultság ellenőrzés - mindenki láthatja a liga állást, aki a klub tagja
    const userRole = await ClubService.getUserRoleInClub(user._id.toString(), league.clubId.toString());
    if (!userRole) {
      return NextResponse.json({ error: 'You must be a member of this club to view league standings' }, { status: 403 });
    }

    const standings = await LeagueService.getLeagueStandings(params.id);

    return NextResponse.json({ success: true, data: standings });
  } catch (error) {
    console.error('Error fetching league standings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
