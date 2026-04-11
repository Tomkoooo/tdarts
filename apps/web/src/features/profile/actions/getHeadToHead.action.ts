'use server';

import { authorizeUserResult } from '@/features/auth/lib/authorizeUser';
import { TournamentService, PlayerService } from '@tdarts/services';
import { withTelemetry } from '@/shared/lib/withTelemetry';
import { resolveGuardAwareStatus } from '@/shared/lib/guards/result';
import { getProfileTopOpponents } from '../lib/profileTopOpponents';

export async function getHeadToHeadAction(params: {
  opponentId?: string;
  mode?: 'top-opponents';
}) {
  const run = withTelemetry(
    'profile.getHeadToHead',
    async (input: { opponentId?: string; mode?: 'top-opponents' }) => {
      const authResult = await authorizeUserResult();
      if (!authResult.ok) {
        return authResult;
      }

      const player = await PlayerService.findPlayerByUserId(authResult.data.userId);
      if (!player) {
        return {
          ok: false as const,
          code: 'NOT_FOUND' as const,
          status: 404,
          message: 'Player not found',
        };
      }

      const playerId = player._id.toString();

      if (input.mode === 'top-opponents') {
        const topOpponents = await getProfileTopOpponents(authResult.data.userId);
        return {
          success: true,
          data: { topOpponents },
        };
      }

      if (input.opponentId) {
        const headToHead = await TournamentService.getHeadToHead(playerId, input.opponentId);
        return {
          success: true,
          data: headToHead,
        };
      }

      return {
        ok: false as const,
        code: 'BAD_REQUEST' as const,
        status: 400,
        message: 'opponentId or mode=top-opponents is required',
      };
    },
    {
      method: 'ACTION',
      metadata: { feature: 'profile', actionName: 'getHeadToHead' },
      resolveStatus: resolveGuardAwareStatus,
    }
  );

  return run(params);
}
