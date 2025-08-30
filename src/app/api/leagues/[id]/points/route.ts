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

    const body = await request.json();
    const { playerId, points, type, notes } = body;

    if (!playerId || typeof points !== 'number' || !type) {
      return NextResponse.json({ error: 'Player ID, points, and type are required' }, { status: 400 });
    }

    if (points < 0) {
      return NextResponse.json({ error: 'Points cannot be negative' }, { status: 400 });
    }

    if (!['manual', 'existing'].includes(type)) {
      return NextResponse.json({ error: 'Type must be either "manual" or "existing"' }, { status: 400 });
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

    // Jogosultság ellenőrzés - csak adminok és moderátorok adhatnak hozzá pontokat
    const userRole = await ClubService.getUserRoleInClub(user._id.toString(), league.clubId.toString());
    if (!userRole || (userRole !== 'admin' && userRole !== 'moderator')) {
      return NextResponse.json({ error: 'Only admins and moderators can add points' }, { status: 403 });
    }

    // Beállítások ellenőrzése
    if (type === 'manual' && !league.settings.allowManualPoints) {
      return NextResponse.json({ error: 'Manual points are not allowed for this league' }, { status: 403 });
    }

    if (type === 'existing' && !league.settings.allowExistingPoints) {
      return NextResponse.json({ error: 'Existing points are not allowed for this league' }, { status: 403 });
    }

    const standing = await LeagueService.addManualPoints(params.id, {
      playerId,
      points,
      type,
      notes
    });

    if (!standing) {
      return NextResponse.json({ error: 'Failed to add points' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: standing }, { status: 201 });
  } catch (error) {
    console.error('Error adding points:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
