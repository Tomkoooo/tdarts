import { connectMongo } from '@/lib/mongoose';
import { LeagueModel } from '@/database/models/league.model';
import { PlayerService } from '@/database/services/player.service';

export type LeagueHistoryEntry = {
  leagueId: string;
  leagueName: string;
  clubId: string;
  clubName: string;
  description?: string;
  totalPoints: number;
  tournamentsPlayed: number;
  position: number;
  joinedAt: string;
  lastActivity?: string;
};

interface LeaguePlayerShape {
  player?: { _id?: unknown; toString?: () => string } | string;
  tournamentPoints?: Array<{ points: number; tournament?: { createdAt?: Date } }>;
  manualAdjustments?: Array<{ points: number }>;
}

function calculatePlayerTotalPoints(leaguePlayer: LeaguePlayerShape): number {
  const tournamentPoints = (leaguePlayer.tournamentPoints || []).reduce(
    (sum, tp) => sum + tp.points,
    0
  );
  const adjustmentPoints = (leaguePlayer.manualAdjustments || []).reduce(
    (sum, adj) => sum + adj.points,
    0
  );
  return tournamentPoints + adjustmentPoints;
}

export async function getProfileLeagueHistory(userId: string): Promise<LeagueHistoryEntry[]> {
  await connectMongo();

  const player = await PlayerService.findPlayerByUserId(userId);
  if (!player) return [];

  const playerId = player._id.toString();

  const leagues = await LeagueModel.find({
    'players.player': playerId,
    isActive: true,
  })
    .populate('club', 'name')
    .populate('players.player', 'name')
    .populate('attachedTournaments', 'createdAt');

  const result: LeagueHistoryEntry[] = [];

  for (const league of leagues) {
    const leagueData = league;
    const playerEntry = leagueData.players?.find((p: LeaguePlayerShape) => {
      const pl = p.player;
      if (!pl) return false;
      const id = typeof pl === 'object' && pl !== null && '_id' in pl ? String((pl as { _id?: unknown })._id) : String(pl);
      return id === playerId;
    });
    if (!playerEntry) continue;

    const totalPoints = calculatePlayerTotalPoints(playerEntry);
    const leaderboard = (leagueData.players || [])
      .map((p: LeaguePlayerShape) => {
        const pl = p.player;
        const playerIdStr = typeof pl === 'object' && pl !== null && '_id' in pl ? String((pl as { _id?: unknown })._id) : (pl ? String(pl) : '');
        return { playerId: playerIdStr, totalPoints: calculatePlayerTotalPoints(p) };
      })
      .sort((a: { totalPoints: number }, b: { totalPoints: number }) => b.totalPoints - a.totalPoints);

    const position =
      leaderboard.findIndex((p: { playerId: string }) => p.playerId === playerId) + 1;
    const tournamentsPlayed = (playerEntry.tournamentPoints || []).length;

    const lastTournamentDate =
      playerEntry.tournamentPoints && playerEntry.tournamentPoints.length > 0
        ? Math.max(
            ...playerEntry.tournamentPoints.map((tp: { tournament?: { createdAt?: Date } }) => {
              const t = tp.tournament;
              return new Date(t?.createdAt ?? 0).getTime();
            })
          )
        : undefined;

    const club = leagueData.club as { _id?: unknown; name?: string } | string | null | undefined;
    const clubId =
      typeof club === 'object' && club?._id
        ? club._id.toString()
        : (leagueData.club?.toString?.() || '');
    const clubName = typeof club === 'object' && club?.name ? club.name : '';

    result.push({
      leagueId: String(leagueData._id ?? ''),
      leagueName: leagueData.name ?? '',
      clubId,
      clubName,
      description: leagueData.description,
      totalPoints,
      tournamentsPlayed,
      position: position > 0 ? position : 999,
      joinedAt: (leagueData as { createdAt?: Date }).createdAt?.toISOString?.() ?? new Date().toISOString(),
      lastActivity: lastTournamentDate
        ? new Date(lastTournamentDate).toISOString()
        : undefined,
    });
  }

  return result.sort(
    (a, b) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime()
  );
}
