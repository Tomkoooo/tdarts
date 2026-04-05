'use server';

import { withTelemetry } from '@/shared/lib/withTelemetry';
import { z } from 'zod';
import { authorizeUserResult, assertEligibilityResult } from '@/shared/lib/guards';
import { canCreateTournamentForSubscription } from '@/features/subscription/lib/subscriptionEligibility';
import { resolveGuardAwareStatus } from '@/shared/lib/guards/result';
import { BadRequestError } from '@/middleware/errorHandle';

const checkSubscriptionInputSchema = z.object({
  clubId: z.string().min(1),
  startDate: z.coerce.date(),
  isSandbox: z.boolean(),
  isVerified: z.boolean(),
});

export type CheckSubscriptionInput = {
  request?: import('next/server').NextRequest;
  clubId: string;
  startDate: Date;
  isSandbox: boolean;
  isVerified: boolean;
};

export const checkSubscriptionAction = withTelemetry(
  'subscription.checkTournamentEligibility',
  async (rawInput: CheckSubscriptionInput) => {
    const parsedInput = checkSubscriptionInputSchema.safeParse({
      clubId: rawInput.clubId,
      startDate: rawInput.startDate,
      isSandbox: rawInput.isSandbox,
      isVerified: rawInput.isVerified,
    });
    if (!parsedInput.success) throw new BadRequestError(parsedInput.error.issues[0]?.message || 'Invalid payload');
    const input = parsedInput.data;

    const authResult = await authorizeUserResult(rawInput.request ? { request: rawInput.request } : undefined);
    if (!authResult.ok) {
      return authResult;
    }

    const eligibilityResult = await assertEligibilityResult({ clubId: input.clubId, allowPaidOverride: true });
    if (!eligibilityResult.ok) {
      return eligibilityResult;
    }

    return canCreateTournamentForSubscription(input.clubId, input.startDate, input.isSandbox, input.isVerified);
  },
  {
    method: 'ACTION',
    metadata: {
      feature: 'subscription',
      actionName: 'checkTournamentEligibility',
    },
    resolveStatus: resolveGuardAwareStatus,
  }
);
