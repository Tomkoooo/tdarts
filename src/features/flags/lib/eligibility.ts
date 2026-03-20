import { FeatureFlagService } from '@/features/flags/lib/featureFlags';
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

export function isPaidOverrideEnabled(): boolean {
  return process.env.NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED === 'false' || process.env.NEXT_PUBLIC_ENABLE_ALL === 'true';
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
  const paidOverride = allowPaidOverride && isPaidOverrideEnabled();
  if (paidOverride) {
    return { ok: true, data: { allowed: true, paidOverride: true, reason: 'paid_override' } };
  }

  if (!params.featureName) {
    return { ok: true, data: { allowed: true, paidOverride: false, reason: 'not_checked' } };
  }

  const enabled = await FeatureFlagService.isFeatureEnabled(params.featureName, params.clubId);
  if (!enabled) {
    return featureDisabledResult(params.featureName);
  }

  return { ok: true, data: { allowed: true, paidOverride: false, reason: 'feature_enabled' } };
}
