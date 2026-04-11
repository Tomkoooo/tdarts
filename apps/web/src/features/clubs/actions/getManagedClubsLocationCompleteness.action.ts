'use server';

import { ClubService } from '@tdarts/services';
import { authorizeUserResult } from '@/shared/lib/guards';
import { withTelemetry } from '@/shared/lib/withTelemetry';
import { resolveGuardAwareStatus } from '@/shared/lib/guards/result';
import { serializeForClient } from '@/shared/lib/serializeForClient';

export async function getManagedClubsLocationCompletenessAction() {
  const run = withTelemetry(
    'clubs.getManagedClubsLocationCompleteness',
    async () => {
      const authResult = await authorizeUserResult();
      if (!authResult.ok) return authResult;
      const clubs = await ClubService.listManagedClubsLocationCompleteness(authResult.data.userId);
      return serializeForClient({ success: true, data: { clubs } });
    },
    {
      method: 'ACTION',
      metadata: { feature: 'clubs', actionName: 'getManagedClubsLocationCompleteness' },
      resolveStatus: resolveGuardAwareStatus,
    },
  );
  return run(undefined);
}
