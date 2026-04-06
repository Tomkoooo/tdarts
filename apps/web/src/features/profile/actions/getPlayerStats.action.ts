'use server';

import { authorizeUserResult } from '@/features/auth/lib/authorizeUser';
import { withTelemetry } from '@/shared/lib/withTelemetry';
import { resolveGuardAwareStatus } from '@/shared/lib/guards/result';
import { getProfilePlayerStats } from '../lib/profilePlayerStats';
import { unstable_cache } from 'next/cache';

export async function getPlayerStatsAction() {
  const run = withTelemetry(
    'profile.getPlayerStats',
    async () => {
      const authResult = await authorizeUserResult();
      if (!authResult.ok) {
        return authResult;
      }
      const userId = authResult.data.userId;
      const cacheEnabled = process.env.HOME_CACHE_ENABLED !== 'false';
      if (!cacheEnabled) {
        const data = await getProfilePlayerStats(userId);
        return { success: true, data };
      }
      const cachedStats = unstable_cache(
        async () => getProfilePlayerStats(userId),
        [`profile-player-stats:${userId}`],
        {
          revalidate: 60,
          tags: ['home:stats', `home:stats:${userId}`],
        }
      );
      const data = await cachedStats();
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
