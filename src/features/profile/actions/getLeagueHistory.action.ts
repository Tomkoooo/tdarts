'use server';

import { authorizeUserResult } from '@/features/auth/lib/authorizeUser';
import { withTelemetry } from '@/shared/lib/withTelemetry';
import { resolveGuardAwareStatus } from '@/shared/lib/guards/result';
import { getProfileLeagueHistory } from '../lib/profileLeagueHistory';

export async function getLeagueHistoryAction() {
  const run = withTelemetry(
    'profile.getLeagueHistory',
    async () => {
      const authResult = await authorizeUserResult();
      if (!authResult.ok) {
        return authResult;
      }
      const data = await getProfileLeagueHistory(authResult.data.userId);
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
