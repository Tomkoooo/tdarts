'use server';

import { z } from 'zod';
import { MatchModel } from '@/database/models/match.model';
import { PlayerService } from '@/database/services/player.service';
import { serializeForClient } from '@/shared/lib/serializeForClient';
import { withTelemetry } from '@/shared/lib/withTelemetry';

const inputSchema = z.object({
  playerId: z.string().min(1),
});

export async function getPlayerStatisticsAction(input: z.infer<typeof inputSchema>) {
  const run = withTelemetry(
    'statistics.getPlayerStatistics',
    async (payload: z.infer<typeof inputSchema>) => {
      const { playerId } = inputSchema.parse(payload);
      const player = await PlayerService.findPlayerById(playerId);
      if (!player) {
        return {
          matchesPlayed: 0,
          winRate: 0,
          overallAverage: 0,
          monthlyPerformance: [],
        };
      }

      const matches = await MatchModel.find({
        status: 'finished',
        $or: [{ 'player1.playerId': playerId }, { 'player2.playerId': playerId }],
      }).sort({ createdAt: -1 });

      const matchesPlayed = matches.length;
      let wins = 0;
      let averageSum = 0;
      let averageCount = 0;
      const monthly = new Map<string, { wins: number; averageSum: number; count: number }>();

      for (const match of matches as any[]) {
        const winnerId = match?.winnerId ? String(match.winnerId) : '';
        if (winnerId && winnerId === playerId) wins += 1;

        const p1Id = String(match?.player1?.playerId || '');
        const isPlayer1 = p1Id === playerId;
        const currentPlayerStats = isPlayer1 ? match?.player1 : match?.player2;
        const avg = Number(currentPlayerStats?.average || 0);
        if (Number.isFinite(avg) && avg > 0) {
          averageSum += avg;
          averageCount += 1;
        }

        const monthKey = new Date(match.createdAt).toISOString().slice(0, 7);
        const monthLabel = new Date(match.createdAt).toLocaleString('en', { month: 'short' });
        const slot = monthly.get(monthKey) || { wins: 0, averageSum: 0, count: 0 };
        if (winnerId && winnerId === playerId) slot.wins += 1;
        if (Number.isFinite(avg) && avg > 0) {
          slot.averageSum += avg;
          slot.count += 1;
        }
        monthly.set(monthKey, slot);

        // Keep label mapping by setting a synthetic property.
        (slot as any).month = monthLabel;
      }

      const winRate = matchesPlayed > 0 ? Number(((wins / matchesPlayed) * 100).toFixed(1)) : 0;
      const overallAverage = averageCount > 0 ? Number((averageSum / averageCount).toFixed(2)) : 0;

      const monthlyPerformance = Array.from(monthly.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([, value]) => ({
          month: (value as any).month || 'N/A',
          wins: value.wins,
          average: value.count > 0 ? Number((value.averageSum / value.count).toFixed(2)) : 0,
        }));

      return serializeForClient({
        matchesPlayed,
        winRate,
        overallAverage,
        monthlyPerformance,
      });
    },
    {
      method: 'ACTION',
      metadata: { feature: 'statistics', actionName: 'getPlayerStatistics' },
    }
  );

  return run(input);
}
