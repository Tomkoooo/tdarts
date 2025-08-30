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
    const { tournamentId, results, notes } = body;

    if (!tournamentId || !results || !Array.isArray(results) || results.length === 0) {
      return NextResponse.json({ error: 'Tournament ID and results array are required' }, { status: 400 });
    }

    // Eredmények validálása
    for (const result of results) {
      if (!result.playerId || typeof result.finish !== 'number' || !result.stage) {
        return NextResponse.json({ error: 'Invalid result format' }, { status: 400 });
      }

      if (result.finish < 1) {
        return NextResponse.json({ error: 'Finish position must be at least 1' }, { status: 400 });
      }

      if (!['group', 'knockout', 'final'].includes(result.stage)) {
        return NextResponse.json({ error: 'Invalid stage' }, { status: 400 });
      }

      if (result.stage === 'knockout' && (!result.knockoutRound || result.knockoutRound < 1)) {
        return NextResponse.json({ error: 'Knockout round is required for knockout stage' }, { status: 400 });
      }
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

    // Jogosultság ellenőrzés - csak adminok és moderátorok adhatnak hozzá verseny eredményeket
    const userRole = await ClubService.getUserRoleInClub(user._id.toString(), league.clubId.toString());
    if (!userRole || (userRole !== 'admin' && userRole !== 'moderator')) {
      return NextResponse.json({ error: 'Only admins and moderators can add tournament results' }, { status: 403 });
    }

    const success = await LeagueService.addTournamentResult(params.id, {
      tournamentId,
      results,
      notes
    });

    if (!success) {
      return NextResponse.json({ error: 'Failed to add tournament results' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Tournament results added successfully' 
    }, { status: 201 });
  } catch (error) {
    console.error('Error adding tournament results:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
