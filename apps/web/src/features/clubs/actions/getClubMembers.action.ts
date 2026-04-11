'use server';

import { ClubService } from '@tdarts/services';
import { BadRequestError } from '@/middleware/errorHandle';
import { withTelemetry } from '@/shared/lib/withTelemetry';
import { serializeForClient } from '@/shared/lib/serializeForClient';

export type GetClubMembersActionInput = {
  clubId: string;
  requestId?: string;
};

export async function getClubMembersAction(input: GetClubMembersActionInput) {
  const run = withTelemetry(
    'clubs.getClubMembers',
    async (params: GetClubMembersActionInput) => {
      const { clubId, requestId } = params;
      if (!clubId) {
        throw new BadRequestError('clubId is required');
      }
      const members = await ClubService.getClubMembersForManagement(clubId, requestId);
      return serializeForClient(members);
    },
    { method: 'ACTION', metadata: { feature: 'clubs', actionName: 'getClubMembers' } }
  );

  return run(input);
}
