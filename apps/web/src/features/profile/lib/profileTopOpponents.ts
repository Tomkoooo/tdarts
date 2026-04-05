import { connectMongo } from '@/lib/mongoose';
import { MatchModel } from '@/database/models/match.model';
import { PlayerModel } from '@/database/models/player.model';
import { PlayerService } from '@/database/services/player.service';

export type TopOpponentEntry = {
  opponent: { _id: string; name: string; country?: string | null };
  matchesPlayed: number;
  wins: number;
  losses: number;
  winRate?: number;
  lastPlayedAt?: string;
};

export async function getProfileTopOpponents(userId: string): Promise<TopOpponentEntry[]> {
  await connectMongo();

  const player = await PlayerService.findPlayerByUserId(userId);
  if (!player) return [];

  const playerId = player._id.toString();

  const matches = await MatchModel.find({
    status: 'finished',
    $or: [{ 'player1.playerId': playerId }, { 'player2.playerId': playerId }],
  })
    .select('player1 player2 winnerId createdAt');

  const opponentStats = new Map<
    string,
    { wins: number; losses: number; lastPlayedAt: Date }
  >();

  const getIdStr = (ref: unknown): string => {
    if (ref == null) return '';
    if (typeof ref === 'object' && ref !== null && '_id' in ref) return String((ref as { _id: unknown })._id);
    return String(ref);
  };

  for (const match of matches) {
    const p1Id = getIdStr(match.player1?.playerId);
    const p2Id = getIdStr(match.player2?.playerId);
    const winnerId = getIdStr(match.winnerId);

    const opponentId = p1Id === playerId ? p2Id : p1Id;
    if (!opponentId) continue;

    const existing = opponentStats.get(opponentId) || {
      wins: 0,
      losses: 0,
      lastPlayedAt: new Date(0),
    };

    if (winnerId === playerId) {
      existing.wins++;
    } else {
      existing.losses++;
    }
    const matchDate = match.createdAt ? new Date(match.createdAt) : new Date(0);
    if (matchDate > existing.lastPlayedAt) {
      existing.lastPlayedAt = matchDate;
    }
    opponentStats.set(opponentId, existing);
  }

  const opponentIds = Array.from(opponentStats.keys());
  const players = await PlayerModel.find({ _id: { $in: opponentIds } }).select(
    '_id name country'
  );

  const playerMap = new Map(players.map((p) => [p._id.toString(), p]));

  const result: TopOpponentEntry[] = opponentIds
    .map((opponentId) => {
      const stats = opponentStats.get(opponentId)!;
      const opponentPlayer = playerMap.get(opponentId);
      const matchesPlayed = stats.wins + stats.losses;
      return {
        opponent: {
          _id: opponentId,
          name: opponentPlayer?.name || 'Unknown',
          country: opponentPlayer?.country ?? null,
        },
        matchesPlayed,
        wins: stats.wins,
        losses: stats.losses,
        winRate: matchesPlayed > 0 ? (stats.wins / matchesPlayed) * 100 : 0,
        lastPlayedAt: stats.lastPlayedAt.getTime() > 0 ? stats.lastPlayedAt.toISOString() : undefined,
      };
    })
    .sort((a, b) => b.matchesPlayed - a.matchesPlayed)
    .slice(0, 50);

  return result;
}
