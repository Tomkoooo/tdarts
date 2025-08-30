import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import { LeagueService } from '@/database/services/league.service';
import { AuthService } from '@/database/services/auth.service';
import { ClubService } from '@/database/services/club.service';
import { FeatureFlagService } from '@/lib/featureFlags';

export async function POST(
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

    // Jogosultság ellenőrzés - csak adminok számíthatják újra a liga állást
    const userRole = await ClubService.getUserRoleInClub(user._id.toString(), league.clubId.toString());
    if (!userRole || userRole !== 'admin') {
      return NextResponse.json({ error: 'Only admins can recalculate league standings' }, { status: 403 });
    }

    const success = await LeagueService.recalculateLeagueStandings(params.id);

    if (!success) {
      return NextResponse.json({ error: 'Failed to recalculate league standings' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'League standings recalculated successfully' 
    });
  } catch (error) {
    console.error('Error recalculating league standings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
