import { FeatureFlagService } from '@/features/flags/lib/featureFlags';
import { normalizeFeatureKey } from '@/features/flags/lib/featureKeys';
import { getSystemSettings } from '@tdarts/core/system-settings';
import { AuthorizationError } from '@/middleware/errorHandle';
import { GuardFailureResult, GuardResult } from '@/shared/lib/telemetry/types';

type EligibilityParams = {
  featureName?: string;
  clubId?: string;
  allowPaidOverride?: boolean;
};

export type EligibilityOutcome = {
  allowed: boolean;
  paidOverride: boolean;
  reason: 'paid_override' | 'feature_enabled' | 'feature_disabled' | 'not_checked';
};

function featureDisabledResult(featureName?: string): GuardFailureResult {
  return {
    ok: false,
    code: 'FEATURE_DISABLED',
    status: 403,
    message: featureName ? `Feature disabled: ${featureName}` : 'Feature disabled',
  };
}

/**
 * "Paid override" means the subscription paywall is off in admin settings
 * (`SystemSettings.subscriptionPaywallEnabled === false` from {@link getSystemSettings}),
 * so we don't gate paid-tier features for that request. This is entirely DB-backed;
 * it is not driven by `NEXT_PUBLIC_*` or any env "escape hatch".
 */
export async function isPaidOverrideEnabled(): Promise<boolean> {
  const settings = await getSystemSettings();
  return !settings.subscriptionPaywallEnabled;
}

export async function assertEligibility(params: EligibilityParams): Promise<EligibilityOutcome> {
  const result = await assertEligibilityResult(params);
  if (!result.ok) {
    throw new AuthorizationError(result.message);
  }

  return result.data;
}

export async function assertEligibilityResult(params: EligibilityParams): Promise<GuardResult<EligibilityOutcome>> {
  const allowPaidOverride = params.allowPaidOverride ?? true;
  const paidOverride = allowPaidOverride && (await isPaidOverrideEnabled());
  if (paidOverride) {
    return { ok: true, data: { allowed: true, paidOverride: true, reason: 'paid_override' } };
  }

  if (!params.featureName) {
    return { ok: true, data: { allowed: true, paidOverride: false, reason: 'not_checked' } };
  }

  const normalizedFeature = normalizeFeatureKey(params.featureName);
  if (!normalizedFeature) {
    return featureDisabledResult(params.featureName);
  }

  const enabled = await FeatureFlagService.isFeatureEnabled(normalizedFeature, params.clubId);
  if (!enabled) {
    return featureDisabledResult(normalizedFeature);
  }

  return { ok: true, data: { allowed: true, paidOverride: false, reason: 'feature_enabled' } };
}
