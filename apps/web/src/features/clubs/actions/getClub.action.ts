'use server';

import { ClubService } from '@tdarts/services';
import { BadRequestError } from '@/middleware/errorHandle';
import { withTelemetry } from '@/shared/lib/withTelemetry';
import { serializeForClient } from '@/shared/lib/serializeForClient';

export type GetClubActionInput = {
  clubId: string;
  detailLevel?: 'summary' | 'full';
};

export async function getClubAction(input: GetClubActionInput) {
  const run = withTelemetry(
    'clubs.getClub',
    async (params: GetClubActionInput) => {
      const { clubId, detailLevel = 'full' } = params;
      if (!clubId) {
        throw new BadRequestError('clubId is required');
      }
      const club = detailLevel === 'summary'
        ? await ClubService.getClubSummary(clubId)
        : await ClubService.getClub(clubId);
      return serializeForClient(club);
    },
    { method: 'ACTION', metadata: { feature: 'clubs', actionName: 'getClub' } }
  );

  return run(input);
}
