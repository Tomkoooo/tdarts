'use server';

import { authorizeUserResult } from '@/features/auth/lib/authorizeUser';
import { withTelemetry } from '@/shared/lib/withTelemetry';
import { resolveGuardAwareStatus } from '@/shared/lib/guards/result';
import { getProfileLeagueHistory } from '../lib/profileLeagueHistory';
import { unstable_cache } from 'next/cache';

export async function getLeagueHistoryAction() {
  const run = withTelemetry(
    'profile.getLeagueHistory',
    async () => {
      const authResult = await authorizeUserResult();
      if (!authResult.ok) {
        return authResult;
      }
      const userId = authResult.data.userId;
      const cacheEnabled = process.env.HOME_CACHE_ENABLED !== 'false';
      if (!cacheEnabled) {
        const data = await getProfileLeagueHistory(userId);
        return { success: true, data };
      }
      const cachedLeagueHistory = unstable_cache(
        async () => getProfileLeagueHistory(userId),
        [`profile-league-history:${userId}`],
        {
          revalidate: 20,
          tags: ['home:leagues', `home:leagues:${userId}`],
        }
      );
      const data = await cachedLeagueHistory();
      return { success: true, data };
    },
    {
      method: 'ACTION',
      metadata: { feature: 'profile', actionName: 'getLeagueHistory' },
      resolveStatus: resolveGuardAwareStatus,
    }
  );

  return run(undefined);
}
