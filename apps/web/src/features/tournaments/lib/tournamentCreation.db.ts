import { LeagueModel } from '@/database/models/league.model';
import { PendingTournamentModel } from '@/database/models/pendingTournament.model';
import { TournamentModel } from '@/database/models/tournament.model';

const CACHE_TTL_MS = 60_000;
const leagueCache = new Map<string, { expiresAt: number; value: Awaited<ReturnType<typeof LeagueModel.findById>> }>();
const verifiedTournamentCache = new Map<
  string,
  { expiresAt: number; value: Awaited<ReturnType<typeof TournamentModel.findOne>> }
>();

export async function findLeagueById(leagueId: string) {
  const now = Date.now();
  const cached = leagueCache.get(leagueId);
  if (cached && cached.expiresAt > now) return cached.value;

  const value = await LeagueModel.findById(leagueId);
  leagueCache.set(leagueId, { expiresAt: now + CACHE_TTL_MS, value });
  return value;
}

export async function findExistingVerifiedTournamentForWeek(clubId: string, weekStart: Date, weekEnd: Date) {
  const cacheKey = `${clubId}:${weekStart.toISOString()}:${weekEnd.toISOString()}`;
  const now = Date.now();
  const cached = verifiedTournamentCache.get(cacheKey);
  if (cached && cached.expiresAt > now) return cached.value;

  const value = await TournamentModel.findOne({
    clubId,
    verified: true,
    'tournamentSettings.startDate': { $gte: weekStart, $lte: weekEnd },
    isDeleted: false,
    isCancelled: false,
  });
  verifiedTournamentCache.set(cacheKey, { expiresAt: now + CACHE_TTL_MS, value });
  return value;
}

export async function createPendingTournament(stripeSessionId: string, payload: unknown) {
  return PendingTournamentModel.create({
    stripeSessionId,
    payload,
  });
}
