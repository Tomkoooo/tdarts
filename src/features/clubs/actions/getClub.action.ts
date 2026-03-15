'use server';

import { ClubService } from '@/database/services/club.service';
import { BadRequestError } from '@/middleware/errorHandle';
import { withTelemetry } from '@/shared/lib/withTelemetry';

export type GetClubActionInput = {
  clubId: string;
};

export async function getClubAction(input: GetClubActionInput) {
  const run = withTelemetry(
    'clubs.getClub',
    async (params: GetClubActionInput) => {
      const { clubId } = params;
      if (!clubId) {
        throw new BadRequestError('clubId is required');
      }
      return ClubService.getClub(clubId);
    },
    { method: 'ACTION', metadata: { feature: 'clubs', actionName: 'getClub' } }
  );

  return run(input);
}
