import { connectMongo } from '@/lib/mongoose';
import { PlayerModel } from '@/database/models/player.model';
import { MatchModel } from '@/database/models/match.model';
import { PlayerService } from '@/database/services/player.service';
function getMMRTier(mmr: number): { name: string; color: string } {
  if (mmr >= 1600) return { name: 'Elit', color: 'text-error' };
  if (mmr >= 1400) return { name: 'Mester', color: 'text-warning' };
  if (mmr >= 1200) return { name: 'Haladó', color: 'text-info' };
  if (mmr >= 1000) return { name: 'Középhaladó', color: 'text-success' };
  if (mmr >= 800) return { name: 'Kezdő+', color: 'text-primary' };
  return { name: 'Kezdő', color: 'text-base-content' };
}

export type ProfilePlayerStatsResult = {
  hasPlayer: boolean;
  player?: {
    _id: string;
    name: string;
    country?: string | null;
    stats: Record<string, unknown>;
    mmrTier: { name: string; color: string };
    globalRank: number | null;
    previousSeasons: unknown[];
    tournamentHistory: unknown[];
    honors: unknown[];
  };
  tournamentHistory?: unknown[];
  matchHistory?: unknown[];
  teams?: unknown[];
  summary?: {
    totalTournaments: number;
    winRate: number;
    legWinRate: number;
    wins: number;
    losses: number;
    totalLegsWon: number;
    totalLegsLost: number;
    avg?: number;
    firstNineAvg?: number;
  };
};

export async function getProfilePlayerStats(userId: string): Promise<ProfilePlayerStatsResult> {
  await connectMongo();

  const player = await PlayerService.findPlayerByUserId(userId);
  if (!player) {
    return { hasPlayer: false };
  }

  const playerId = player._id.toString();
  const stats = player.stats || {};
  const mmr = (stats as { mmr?: number }).mmr ?? 800;
  const mmrTier = getMMRTier(mmr);

  // Get match history - all finished matches for this player
  const matches = await MatchModel.find({
    status: 'finished',
    $or: [{ 'player1.playerId': playerId }, { 'player2.playerId': playerId }],
  })
    .populate('tournamentRef', 'tournamentId tournamentSettings groups knockout boards')
    .populate('player1.playerId', 'name country')
    .populate('player2.playerId', 'name country')
    .sort({ createdAt: -1 })
    .limit(100);

  const matchHistory = matches.map((match) => {
    const p1Ref = match.player1?.playerId;
    const p1IdStr = p1Ref ? (typeof p1Ref === 'object' && p1Ref !== null && '_id' in p1Ref ? String((p1Ref as { _id: unknown })._id) : String(p1Ref)) : '';
    const isPlayer1 = p1IdStr === playerId;
    const playerData = isPlayer1 ? match.player1 : match.player2;
    const tournament = match.tournamentRef as { groups?: Array<{ matches?: unknown[]; board?: number }>; knockout?: Array<{ matches?: Array<{ matchReference?: unknown }> }>; boards?: Array<{ boardNumber?: number; name?: string }> } | null;
    let round: string | undefined;
    let groupName: string | undefined;

    if (match.type === 'group' && tournament?.groups) {
      const group = tournament.groups.find(
        (g) =>
          Array.isArray(g.matches) && g.matches.some((mid) => String(mid) === match._id?.toString())
      );
      if (group) {
        const board = tournament.boards?.find((b) => b.boardNumber === group.board);
        groupName = board?.name || `Csoport ${group.board ?? ''}`;
      }
    } else if (match.type === 'knockout' && tournament?.knockout) {
      for (let i = 0; i < tournament.knockout.length; i++) {
        const roundData = tournament.knockout[i];
        if (roundData.matches?.some((m) => String(m.matchReference) === match._id?.toString())) {
          round = `${i + 1}. kör`;
          break;
        }
      }
    }

    const matchObj = match.toObject ? match.toObject() : match;
    return {
      ...matchObj,
      average: playerData?.average || 0,
      firstNineAvg: playerData?.firstNineAvg || 0,
      highestCheckout: playerData?.highestCheckout || 0,
      oneEightiesCount: playerData?.oneEightiesCount || 0,
      round,
      groupName,
    };
  });

  const teams = await PlayerService.findTeamsForPlayer(playerId);

  const totalMatchesWon = (stats as { totalMatchesWon?: number }).totalMatchesWon ?? 0;
  const totalMatchesLost = (stats as { totalMatchesLost?: number }).totalMatchesLost ?? 0;
  const totalLegsWon = (stats as { totalLegsWon?: number }).totalLegsWon ?? 0;
  const totalLegsLost = (stats as { totalLegsLost?: number }).totalLegsLost ?? 0;
  const totalMatches = totalMatchesWon + totalMatchesLost;
  const totalLegs = totalLegsWon + totalLegsLost;

  const tournamentHistory = (player.tournamentHistory || []) as unknown[];

  return {
    hasPlayer: true,
    player: {
      _id: player._id.toString(),
      name: player.name,
      country: player.country ?? null,
      stats: stats as Record<string, unknown>,
      mmrTier,
      globalRank: null,
      previousSeasons: player.previousSeasons || [],
      tournamentHistory: tournamentHistory,
      honors: player.honors || [],
    },
    tournamentHistory,
    matchHistory,
    teams,
    summary: {
      totalTournaments: tournamentHistory.length,
      winRate: totalMatches > 0 ? (totalMatchesWon / totalMatches) * 100 : 0,
      legWinRate: totalLegs > 0 ? (totalLegsWon / totalLegs) * 100 : 0,
      wins: totalMatchesWon,
      losses: totalMatchesLost,
      totalLegsWon,
      totalLegsLost,
      avg: (stats as { avg?: number }).avg,
      firstNineAvg: (stats as { firstNineAvg?: number }).firstNineAvg,
    },
  };
}
