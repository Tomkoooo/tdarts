'use server';

import { authorizeUserResult } from '@/features/auth/lib/authorizeUser';
import { FeedbackService } from '@/database/services/feedback.service';
import { withTelemetry } from '@/shared/lib/withTelemetry';
import { resolveGuardAwareStatus } from '@/shared/lib/guards/result';
import { serializeForClient } from '@/shared/lib/serializeForClient';

export async function getUnreadTicketCountAction() {
  const run = withTelemetry(
    'profile.getUnreadTicketCount',
    async () => {
      const authResult = await authorizeUserResult();
      if (!authResult.ok) {
        return authResult;
      }
      const count = await FeedbackService.getUnreadFeedbackCountByUserId(authResult.data.userId);
      return serializeForClient({ success: true, data: { count } });
    },
    {
      method: 'ACTION',
      metadata: { feature: 'profile', actionName: 'getUnreadTicketCount' },
      resolveStatus: resolveGuardAwareStatus,
    }
  );

  return run(undefined);
}
