'use server';

import { LeagueService } from '@tdarts/services';
import { BadRequestError } from '@/middleware/errorHandle';
import { withTelemetry } from '@/shared/lib/withTelemetry';
import { serializeForClient } from '@/shared/lib/serializeForClient';

export type GetClubLeaguesActionInput = {
  clubId: string;
  includeInactive?: boolean;
};

export async function getClubLeaguesAction(input: GetClubLeaguesActionInput) {
  const run = withTelemetry(
    'clubs.getClubLeagues',
    async (params: GetClubLeaguesActionInput) => {
      const { clubId, includeInactive = false } = params;
      if (!clubId) {
        throw new BadRequestError('clubId is required');
      }
      const leagues = await LeagueService.getClubLeagues(clubId, !includeInactive);
      return serializeForClient({ leagues });
    },
    { method: 'ACTION', metadata: { feature: 'clubs', actionName: 'getClubLeagues' } }
  );

  return run(input);
}
