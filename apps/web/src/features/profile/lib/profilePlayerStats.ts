import { connectMongo } from '@/lib/mongoose';
import { UserModel, PlayerModel, MatchModel, TournamentModel } from '@tdarts/core';
import { PlayerService } from '@tdarts/services';
import { serializeForClient } from '@/shared/lib/serializeForClient';
import mongoose from 'mongoose';
import { unstable_cache } from 'next/cache';
function getMMRTier(mmr: number): { name: string; color: string } {
  if (mmr >= 1600) return { name: 'Elit', color: 'text-error' };
  if (mmr >= 1400) return { name: 'Mester', color: 'text-warning' };
  if (mmr >= 1200) return { name: 'Haladó', color: 'text-info' };
  if (mmr >= 1000) return { name: 'Középhaladó', color: 'text-success' };
  if (mmr >= 800) return { name: 'Kezdő+', color: 'text-primary' };
  return { name: 'Kezdő', color: 'text-base-content' };
}

export type ProfileCompletenessIssue = 'photo' | 'country';

export type ProfilePlayerStatsResult = {
  hasPlayer: boolean;
  /** Shown on home dashboard when the user should fill in profile fields */
  profileCompleteness?: { issues: ProfileCompletenessIssue[]; count: number };
  player?: {
    _id: string;
    name: string;
    country?: string | null;
    profilePicture?: string | null;
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

const getGlobalRankByMmr = unstable_cache(
  async (mmr: number) => {
    await connectMongo();
    return (await PlayerModel.countDocuments({ 'stats.mmr': { $gt: mmr } })) + 1;
  },
  ['profile-global-rank-by-mmr'],
  { revalidate: 300, tags: ['home:stats'] }
);

export async function getProfilePlayerStats(userId: string): Promise<ProfilePlayerStatsResult> {
  await connectMongo();

  const player = await PlayerService.findPlayerByUserId(userId);
  if (!player) {
    return { hasPlayer: false, profileCompleteness: { issues: [], count: 0 } };
  }

  const playerId = player._id.toString();
  const playerObjectId = new mongoose.Types.ObjectId(playerId);
  const stats = player.stats || {};
  const mmr = (stats as { mmr?: number }).mmr ?? 800;
  const mmrTier = getMMRTier(mmr);
  const globalRank = await getGlobalRankByMmr(mmr);

  // Get match history with lean projection to avoid expensive populate chains.
  const matches = await MatchModel.find(
    {
      status: 'finished',
      $or: [{ 'player1.playerId': playerObjectId }, { 'player2.playerId': playerObjectId }],
    },
    {
      _id: 1,
      tournamentRef: 1,
      type: 1,
      winnerId: 1,
      createdAt: 1,
      player1: 1,
      player2: 1,
      boardReference: 1,
      round: 1,
      legsToWin: 1,
      status: 1,
    }
  )
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  const tournamentIds = Array.from(
    new Set(
      matches
        .map((match) => String(match.tournamentRef || ''))
        .filter((id): id is string => Boolean(id))
    )
  );
  const tournaments = tournamentIds.length
    ? await TournamentModel.find(
        { _id: { $in: tournamentIds.map((id) => new mongoose.Types.ObjectId(id)) } },
        {
          _id: 1,
          tournamentId: 1,
          tournamentSettings: 1,
          groups: 1,
          knockout: 1,
          boards: 1,
        }
      ).lean()
    : [];
  const tournamentMap = new Map<string, any>(tournaments.map((t: any) => [String(t._id), t]));

  const participantIds = Array.from(
    new Set(
      matches.flatMap((match: any) => [
        match?.player1?.playerId ? String(match.player1.playerId) : '',
        match?.player2?.playerId ? String(match.player2.playerId) : '',
      ]).filter((id): id is string => Boolean(id))
    )
  );
  const participants = participantIds.length
    ? await PlayerModel.find(
        { _id: { $in: participantIds.map((id) => new mongoose.Types.ObjectId(id)) } },
        { _id: 1, name: 1, country: 1 }
      ).lean()
    : [];
  const participantMap = new Map<string, any>(participants.map((p: any) => [String(p._id), p]));

  const matchHistory = matches.map((match) => {
    const p1Ref = match.player1?.playerId;
    const p1IdStr = p1Ref ? String(p1Ref) : '';
    const isPlayer1 = p1IdStr === playerId;
    const playerData = isPlayer1 ? match.player1 : match.player2;
    const opponentData = isPlayer1 ? match.player2 : match.player1;
    const opponentId = opponentData?.playerId ? String(opponentData.playerId) : '';
    const opponentName = String(participantMap.get(opponentId)?.name || '');
    const tournament = tournamentMap.get(String(match.tournamentRef || '')) as
      | {
          groups?: Array<{ matches?: unknown[]; board?: number }>;
          knockout?: Array<{ matches?: Array<{ matchReference?: unknown }> }>;
          boards?: Array<{ boardNumber?: number; name?: string }>;
        }
      | undefined;
    let round: string | undefined;
    let groupName: string | undefined;

    if (match.type === 'group' && Array.isArray(tournament?.groups)) {
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

    const matchObj = match;
    const winnerId = match?.winnerId ? String(match.winnerId) : '';
    const won = Boolean(winnerId && winnerId === playerId);
    const player1Score = Number(isPlayer1 ? match?.player1?.legsWon : match?.player2?.legsWon) || 0;
    const player2Score = Number(isPlayer1 ? match?.player2?.legsWon : match?.player1?.legsWon) || 0;
    const createdAtIso = match?.createdAt ? new Date(match.createdAt).toISOString() : new Date().toISOString();

    return {
      ...matchObj,
      date: createdAtIso,
      opponent: opponentName || '—',
      won,
      player1Score,
      player2Score,
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

  const safeNumber = (value: unknown, fallback: number = 0) =>
    Number.isFinite(Number(value)) ? Number(value) : fallback;

  const tournamentHistory = (player.tournamentHistory || []) as unknown[];

  const userDoc = await UserModel.findById(userId).select('country profilePicture').lean();
  const userCountry =
    userDoc && userDoc.country != null && String(userDoc.country).trim() !== ''
      ? String(userDoc.country).trim()
      : '';
  const userPic =
    userDoc && userDoc.profilePicture != null && String(userDoc.profilePicture).trim() !== ''
      ? String(userDoc.profilePicture).trim()
      : '';

  const profileIssues: ProfileCompletenessIssue[] = [];
  const pic = (player as { profilePicture?: string | null }).profilePicture;
  const playerPicTrim = pic == null || String(pic).trim() === '' ? '' : String(pic).trim();
  const playerCountryTrim =
    player.country == null || String(player.country).trim() === '' ? '' : String(player.country).trim();

  if (!playerPicTrim && !userPic) profileIssues.push('photo');
  if (!playerCountryTrim && !userCountry) profileIssues.push('country');

  return serializeForClient({
    hasPlayer: true,
    profileCompleteness: { issues: profileIssues, count: profileIssues.length },
    player: {
      _id: player._id.toString(),
      name: player.name,
      country: player.country ?? null,
      profilePicture: pic ?? null,
      stats: stats as Record<string, unknown>,
      mmrTier,
      globalRank,
      previousSeasons: player.previousSeasons || [],
      tournamentHistory: tournamentHistory,
      honors: player.honors || [],
    },
    tournamentHistory,
    matchHistory,
    teams,
    summary: {
      totalTournaments: tournamentHistory.length,
      winRate: totalMatches > 0 ? safeNumber((totalMatchesWon / totalMatches) * 100) : 0,
      legWinRate: totalLegs > 0 ? safeNumber((totalLegsWon / totalLegs) * 100) : 0,
      wins: totalMatchesWon,
      losses: totalMatchesLost,
      totalLegsWon,
      totalLegsLost,
      avg: safeNumber((stats as { avg?: number }).avg),
      firstNineAvg: safeNumber((stats as { firstNineAvg?: number }).firstNineAvg),
    },
  }) as ProfilePlayerStatsResult;
}
