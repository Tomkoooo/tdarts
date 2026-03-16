'use server';

import { z } from 'zod';
import { authorizeUserResult } from '@/shared/lib/guards';
import { withTelemetry } from '@/shared/lib/withTelemetry';
import { resolveGuardAwareStatus } from '@/shared/lib/guards/result';
import { BadRequestError } from '@/middleware/errorHandle';
import { connectMongo } from '@/lib/mongoose';
import { PlayerService } from '@/database/services/player.service';
import { TournamentModel } from '@/database/models/tournament.model';
import { serializeForClient } from '@/shared/lib/serializeForClient';

const schema = z.object({
  limit: z.number().int().positive().max(20).optional(),
});

export async function getUserTournamentsAction(input: z.infer<typeof schema> = {}) {
  const run = withTelemetry(
    'tournaments.getUserTournaments',
    async (params: z.infer<typeof schema>) => {
      const parsed = schema.safeParse(params);
      if (!parsed.success) {
        throw new BadRequestError(parsed.error.issues[0]?.message || 'Invalid input');
      }

      const authResult = await authorizeUserResult();
      if (!authResult.ok) return authResult;

      await connectMongo();
      const player = await PlayerService.findPlayerByUserId(authResult.data.userId);
      if (!player) {
        return { success: true, data: [] };
      }

      const limit = parsed.data.limit ?? 5;
      const tournaments = await TournamentModel.find({
        isDeleted: { $ne: true },
        isArchived: { $ne: true },
        'tournamentPlayers.playerReference': player._id,
      })
        .select('tournamentId tournamentSettings.name tournamentSettings.startDate tournamentSettings.status')
        .sort({ 'tournamentSettings.startDate': 1, createdAt: -1 })
        .limit(limit)
        .lean();

      const data = tournaments.map((item) => ({
        _id: String(item._id),
        name: item.tournamentSettings?.name || 'Tournament',
        code: item.tournamentId || '',
        date: item.tournamentSettings?.startDate || null,
        status: item.tournamentSettings?.status || 'pending',
      }));

      return serializeForClient({ success: true, data });
    },
    {
      method: 'ACTION',
      metadata: { feature: 'tournaments', actionName: 'getUserTournaments' },
      resolveStatus: resolveGuardAwareStatus,
    }
  );

  return run(input);
}
