'use server';

import { ClubSubscriptionService } from '@/database/services/club-subscription.service';
import { z } from 'zod';
import { authorizeUserResult } from '@/shared/lib/guards';
import { BadRequestError } from '@/middleware/errorHandle';
import { withTelemetry } from '@/shared/lib/withTelemetry';
import { resolveGuardAwareStatus } from '@/shared/lib/guards/result';

const schema = z.object({
  clubId: z.string(),
});

export async function getSubscriptionStatusAction(input: z.infer<typeof schema>) {
  const run = withTelemetry(
    'clubs.getSubscriptionStatus',
    async (params: z.infer<typeof schema>) => {
      const parsed = schema.safeParse(params);
      if (!parsed.success) {
        throw new BadRequestError(parsed.error.issues[0]?.message || 'Invalid input');
      }
      const { clubId } = parsed.data;
      const authResult = await authorizeUserResult();
      if (!authResult.ok) return authResult;
      const subscribed = await ClubSubscriptionService.isSubscribed(authResult.data.userId, clubId);
      return { subscribed };
    },
    {
      method: 'ACTION',
      metadata: { feature: 'clubs', actionName: 'getSubscriptionStatus', clubId: input.clubId },
      resolveStatus: resolveGuardAwareStatus,
    }
  );
  return run(input);
}
