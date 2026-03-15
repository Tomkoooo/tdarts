'use server';

import { authorizeUserResult } from '@/features/auth/lib/authorizeUser';
import { withTelemetry } from '@/shared/lib/withTelemetry';
import { resolveGuardAwareStatus } from '@/shared/lib/guards/result';
import { getProfilePlayerStats } from '../lib/profilePlayerStats';

export async function getPlayerStatsAction() {
  const run = withTelemetry(
    'profile.getPlayerStats',
    async () => {
      const authResult = await authorizeUserResult();
      if (!authResult.ok) {
        return authResult;
      }
      const data = await getProfilePlayerStats(authResult.data.userId);
      return { success: true, data };
    },
    {
      method: 'ACTION',
      metadata: { feature: 'profile', actionName: 'getPlayerStats' },
      resolveStatus: resolveGuardAwareStatus,
    }
  );

  return run(undefined);
}
