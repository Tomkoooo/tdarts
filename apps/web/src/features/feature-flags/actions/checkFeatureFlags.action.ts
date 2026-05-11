'use server';

import { z } from 'zod';
import { withTelemetry } from '@/shared/lib/withTelemetry';
import { evaluateFeatureAccess, PAYWALLED_FEATURES } from '@/features/flags/lib/featureAccess';
import { normalizeFeatureKey } from '@/features/flags/lib/featureKeys';
import { getSystemSettings } from '@tdarts/core/system-settings';
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
  /** Set when access was granted via super-admin bypass. */
  bypassReason?: 'super_admin' | 'paywall_disabled' | 'none';
};

const checkSocketFlagInputSchema = z.object({
  clubId: z.string().optional(),
});

export type CheckSocketFlagInput = {
  clubId?: string;
};

export type CheckSocketFlagResult = {
  enabled: boolean;
  bypassReason?: 'super_admin' | 'paywall_disabled' | 'none';
};

export async function checkFeatureFlagAction(
  rawInput: CheckFeatureFlagInput
): Promise<CheckFeatureFlagResult | GuardFailureResult> {
  const parsedInput = checkFeatureFlagInputSchema.safeParse(rawInput);
  if (!parsedInput.success) throw new BadRequestError(parsedInput.error.issues[0]?.message || 'Invalid payload');
  const input = parsedInput.data;

  const action = withTelemetry('featureFlags.checkFeature', async (payload: CheckFeatureFlagInput) => {
    const normalizedFeature = normalizeFeatureKey(payload.feature);
    if (!normalizedFeature) {
      return {
        ok: false,
        code: 'FEATURE_DISABLED',
        status: 403,
        message: `Feature disabled: ${payload.feature}`,
      } satisfies GuardFailureResult;
    }

    const accessResult = await evaluateFeatureAccess({
      featureName: normalizedFeature,
      clubId: payload.clubId,
      requiresSubscription: PAYWALLED_FEATURES.has(normalizedFeature),
    });
    if (!accessResult.ok) {
      return accessResult;
    }

    const settings = await getSystemSettings();
    return {
      enabled: true,
      subscriptionModelEnabled: settings.subscriptionPaywallEnabled,
      bypassReason: accessResult.data.bypassReason,
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
    const accessResult = await evaluateFeatureAccess({
      featureName: 'SOCKET',
      clubId: payload.clubId,
      requiresSubscription: true,
    });
    if (!accessResult.ok) {
      return accessResult;
    }

    return {
      enabled: true,
      bypassReason: accessResult.data.bypassReason,
    };
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
