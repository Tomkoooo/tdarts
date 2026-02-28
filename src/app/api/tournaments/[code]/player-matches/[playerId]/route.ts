import { NextRequest, NextResponse } from 'next/server';
import { TournamentService } from '@/database/services/tournament.service';
import { AuthService } from '@/database/services/auth.service';
import { PlayerModel } from '@/database/models/player.model';
import { AuthorizationService } from '@/database/services/authorization.service';
import { withApiTelemetry } from '@/lib/api-telemetry';

async function __GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string; playerId: string }> }
) {
  try {
    const { code, playerId } =  await params;
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!code || !playerId) {
      return NextResponse.json(
        { success: false, error: 'Missing tournament code or player ID' },
        { status: 400 }
      );
    }

    const user = await AuthService.verifyToken(token);
    const tournament = await TournamentService.getTournament(code);

    const canModerate = await AuthorizationService.checkAdminOrModerator(
      user._id.toString(),
      tournament.clubId.toString()
    );
    const basePlayers = await PlayerModel.find({ userRef: user._id }).select('_id');
    const baseIds = basePlayers.map((p) => p._id);
    const teamPlayers = baseIds.length
      ? await PlayerModel.find({ members: { $in: baseIds } }).select('_id')
      : [];
    const userPlayerIds = new Set([...basePlayers, ...teamPlayers].map((p) => p._id.toString()));

    const userInTournament = tournament.tournamentPlayers.some((tp: any) =>
      userPlayerIds.has(tp.playerReference?.toString())
    );

    if (!canModerate && !userInTournament) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    const matches = await TournamentService.getPlayerMatches(code, playerId);

    return NextResponse.json({
      success: true,
      matches: matches
    });

  } catch (error) {
    console.error('Get player matches error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch player matches' },
      { status: 500 }
    );
  }
}

export const GET = withApiTelemetry('/api/tournaments/[code]/player-matches/[playerId]', __GET as any);
