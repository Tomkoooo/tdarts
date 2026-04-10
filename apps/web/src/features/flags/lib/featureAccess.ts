import { AuthorizationService } from '@/database/services/authorization.service';
import { authorizeUserResult } from '@/features/auth/lib/authorizeUser';
import { FEATURE_KEYS, normalizeFeatureKey } from '@/features/flags/lib/featureKeys';
import { FeatureFlagService } from '@/features/flags/lib/featureFlags';
import { isSubscriptionPaywallActive } from '@/features/flags/lib/subscriptionPaywall';
import { GuardFailureResult, GuardResult } from '@/shared/lib/telemetry/types';

type FeatureAccessParams = {
  request?: import('next/server').NextRequest;
  featureName: string;
  clubId?: string;
  requiresSubscription?: boolean;
  permissionCheck?: (ctx: { userId: string; clubId?: string }) => Promise<boolean>;
};

export type FeatureAccessOutcome = {
  userId: string;
  featureKey: string;
  bypassReason: 'none' | 'super_admin' | 'paywall_disabled';
};

function denial(code: GuardFailureResult['code'], message: string): GuardFailureResult {
  return {
    ok: false,
    code,
    status: code === 'LOGIN_REQUIRED' ? 401 : 403,
    message,
  };
}

export async function evaluateFeatureAccess(params: FeatureAccessParams): Promise<GuardResult<FeatureAccessOutcome>> {
  const authResult = await authorizeUserResult(params.request ? { request: params.request } : undefined);
  if (!authResult.ok) {
    return denial('LOGIN_REQUIRED', authResult.message);
  }

  const userId = authResult.data.userId;
  let isGlobalAdmin = false;
  try {
    isGlobalAdmin = await AuthorizationService.isGlobalAdmin(userId);
  } catch {
    isGlobalAdmin = false;
  }
  const normalizedFeature = normalizeFeatureKey(params.featureName);

  if (!normalizedFeature) {
    return denial('FEATURE_DISABLED', `Feature disabled: ${params.featureName}`);
  }

  if (isGlobalAdmin) {
    return {
      ok: true,
      data: {
        userId,
        featureKey: normalizedFeature,
        bypassReason: 'super_admin',
      },
    };
  }

  const enabled = await FeatureFlagService.isFeatureEnabled(normalizedFeature, params.clubId);
  if (!enabled) {
    return denial('FEATURE_DISABLED', `Feature disabled: ${normalizedFeature}`);
  }

  const requiresSubscription = params.requiresSubscription ?? false;
  const paywallEnabled = isSubscriptionPaywallActive();
  if (requiresSubscription && paywallEnabled && params.clubId) {
    const hasSubscriptionAccess = await FeatureFlagService.isClubFeatureEnabled(params.clubId, normalizedFeature);
    if (!hasSubscriptionAccess) {
      return denial('SUBSCRIPTION_REQUIRED', `Feature requires subscription: ${normalizedFeature}`);
    }
  }

  if (params.permissionCheck) {
    const hasPermission = await params.permissionCheck({ userId, clubId: params.clubId });
    if (!hasPermission) {
      return denial('PERMISSION_REQUIRED', 'Insufficient permissions');
    }
  }

  return {
    ok: true,
    data: {
      userId,
      featureKey: normalizedFeature,
      bypassReason: !paywallEnabled && requiresSubscription ? 'paywall_disabled' : 'none',
    },
  };
}

export const PAYWALLED_FEATURES = new Set<string>([
  FEATURE_KEYS.LEAGUES,
  FEATURE_KEYS.PREMIUM_TOURNAMENTS,
  FEATURE_KEYS.SOCKET,
  FEATURE_KEYS.DETAILED_STATISTICS,
]);
