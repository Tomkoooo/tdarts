'use server';

import { ClubService } from '@tdarts/services';
import { withTelemetry } from '@/shared/lib/withTelemetry';

export type GetUserRoleActionInput = {
  clubId: string;
  userId?: string;
  requestId?: string;
};

export type GetUserRoleActionResult = {
  role: 'admin' | 'moderator' | 'member' | 'none';
};

export async function getUserRoleAction(input: GetUserRoleActionInput): Promise<GetUserRoleActionResult> {
  const run = withTelemetry(
    'clubs.getUserRole',
    async (params: GetUserRoleActionInput) => {
      const { clubId, userId, requestId } = params;
      if (!userId) {
        return { role: 'none' };
      }
      const role = await ClubService.getUserRoleInClub(userId, clubId, requestId);
      const validRole: GetUserRoleActionResult['role'] = ['admin', 'moderator', 'member', 'none'].includes(role) ? role as GetUserRoleActionResult['role'] : 'none';
      return { role: validRole };
    },
    { method: 'ACTION', metadata: { feature: 'clubs', actionName: 'getUserRole' } }
  );

  return run(input) as Promise<GetUserRoleActionResult>;
}
