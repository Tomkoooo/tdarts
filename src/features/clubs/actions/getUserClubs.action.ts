'use server';

import { ClubService } from '@/database/services/club.service';
import { authorizeUserResult } from '@/shared/lib/guards';
import { withTelemetry } from '@/shared/lib/withTelemetry';
import { resolveGuardAwareStatus } from '@/shared/lib/guards/result';

export async function getUserClubsAction() {
  const run = withTelemetry(
    'clubs.getUserClubs',
    async () => {
      const authResult = await authorizeUserResult();
      if (!authResult.ok) return authResult;
      const { clubs, userRoleInClub } = await ClubService.getUserClubs(authResult.data.userId);
      return { clubs, userRoleInClub };
    },
    {
      method: 'ACTION',
      metadata: { feature: 'clubs', actionName: 'getUserClubs' },
      resolveStatus: resolveGuardAwareStatus,
    }
  );
  return run(undefined);
}
