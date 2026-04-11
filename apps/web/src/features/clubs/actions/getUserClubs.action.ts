'use server';

import { ClubService } from '@tdarts/services';
import { authorizeUserResult } from '@/shared/lib/guards';
import { withTelemetry } from '@/shared/lib/withTelemetry';
import { resolveGuardAwareStatus } from '@/shared/lib/guards/result';
import { serializeForClient } from '@/shared/lib/serializeForClient';

export async function getUserClubsAction() {
  const run = withTelemetry(
    'clubs.getUserClubs',
    async () => {
      const authResult = await authorizeUserResult();
      if (!authResult.ok) return authResult;
      const { clubs } = await ClubService.getUserClubs(authResult.data.userId);
      return serializeForClient({ clubs });
    },
    {
      method: 'ACTION',
      metadata: { feature: 'clubs', actionName: 'getUserClubs' },
      resolveStatus: resolveGuardAwareStatus,
    }
  );
  return run(undefined);
}
