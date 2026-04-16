'use server';

import { TournamentService } from '@tdarts/services';
import { BadRequestError } from '@/middleware/errorHandle';
import { withTelemetry } from '@/shared/lib/withTelemetry';
import { serializeForClient } from '@/shared/lib/serializeForClient';

/**
 * TV route only: legs + player ids for 180/checkout timestamps.
 * Throttle calls from the client; do not attach to hot tournament summary fetches.
 */
export async function getTournamentTvRankingLegContextAction(code: string) {
  const run = withTelemetry(
    'tournaments.getTournamentTvRankingLegContext',
    async (tournamentCode: string) => {
      if (!tournamentCode) {
        throw new BadRequestError('code is required');
      }
      const matches = await TournamentService.getTvRankingLegMatches(tournamentCode);
      return serializeForClient({ matches });
    },
    { method: 'ACTION', metadata: { feature: 'tournaments', actionName: 'getTournamentTvRankingLegContext' } },
  );

  return run(code);
}
