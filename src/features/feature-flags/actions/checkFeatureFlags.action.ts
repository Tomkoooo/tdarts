'use server';

import { FeatureFlagService } from '@/features/flags/lib/featureFlags';
import { z } from 'zod';
import { withTelemetry } from '@/shared/lib/withTelemetry';
import { authorizeUserResult, assertEligibilityResult } from '@/shared/lib/guards';
import { resolveGuardAwareStatus } from '@/shared/lib/guards/result';
import { GuardFailureResult } from '@/shared/lib/telemetry/types';
import { BadRequestError } from '@/middleware/errorHandle';

const checkFeatureFlagInputSchema = z.object({
  feature: z.string().min(1),
  clubId: z.string().optional(),
});

export type CheckFeatureFlagInput = {
  feature: string;
  clubId?: string;
};

export type CheckFeatureFlagResult = {
  enabled: boolean;
  subscriptionModelEnabled: boolean;
};

const checkSocketFlagInputSchema = z.object({
  clubId: z.string().optional(),
});

export type CheckSocketFlagInput = {
  clubId?: string;
};

export type CheckSocketFlagResult = {
  enabled: boolean;
};

export async function checkFeatureFlagAction(
  rawInput: CheckFeatureFlagInput
): Promise<CheckFeatureFlagResult | GuardFailureResult> {
  const parsedInput = checkFeatureFlagInputSchema.safeParse(rawInput);
  if (!parsedInput.success) throw new BadRequestError(parsedInput.error.issues[0]?.message || 'Invalid payload');
  const input = parsedInput.data;

  const action = withTelemetry('featureFlags.checkFeature', async (payload: CheckFeatureFlagInput) => {
    const authResult = await authorizeUserResult();
    if (!authResult.ok) {
      return authResult;
    }

    const eligibilityResult = await assertEligibilityResult({
      featureName: payload.feature,
      clubId: payload.clubId,
      allowPaidOverride: true,
    });
    if (!eligibilityResult.ok) {
      return eligibilityResult;
    }

    const enabled = await FeatureFlagService.isFeatureEnabled(payload.feature, payload.clubId || undefined);
    return {
      enabled,
      subscriptionModelEnabled: process.env.NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED !== 'false',
    };
  }, {
    method: 'ACTION',
    metadata: {
      feature: 'featureFlags',
      actionName: 'checkFeature',
    },
    resolveStatus: resolveGuardAwareStatus,
  });

  return action(input);
}

export async function checkSocketFlagAction(input: CheckSocketFlagInput): Promise<CheckSocketFlagResult | GuardFailureResult> {
  const parsedInput = checkSocketFlagInputSchema.safeParse(input);
  if (!parsedInput.success) throw new BadRequestError(parsedInput.error.issues[0]?.message || 'Invalid payload');

  const action = withTelemetry('featureFlags.checkSocket', async (payload: CheckSocketFlagInput) => {
    const authResult = await authorizeUserResult();
    if (!authResult.ok) {
      return authResult;
    }

    const eligibilityResult = await assertEligibilityResult({
      featureName: 'socket',
      clubId: payload.clubId,
      allowPaidOverride: true,
    });
    if (!eligibilityResult.ok) {
      return eligibilityResult;
    }

    const enabled = await FeatureFlagService.isSocketEnabled(payload.clubId || undefined);
    return { enabled };
  }, {
    method: 'ACTION',
    metadata: {
      feature: 'featureFlags',
      actionName: 'checkSocket',
    },
    resolveStatus: resolveGuardAwareStatus,
  });

  return action(parsedInput.data);
}
