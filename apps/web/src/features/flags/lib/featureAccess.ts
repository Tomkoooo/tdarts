import { AuthorizationService } from '@/database/services/authorization.service';
import { authorizeUserResult } from '@/features/auth/lib/authorizeUser';
import { normalizeFeatureKey } from '@/features/flags/lib/featureKeys';
import { FeatureFlagService } from '@/features/flags/lib/featureFlags';
import { PAYWALLED_FEATURE_KEYS } from '@/features/flags/lib/featureRegistry';
import { getSystemSettings } from '@tdarts/core/system-settings';
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

/**
 * Single source of truth for "can this user use this feature for this club?".
 * Order of checks is significant: we deny in the order login → feature global
 * toggle → tier (subscription required) → club flag (club not eligible) →
 * permission so the UI can render the most specific reason.
 *
 * Super-admin bypass only kicks in when `SystemSettings.superAdminBypassEnabled`
 * is true; toggling it off lets a global admin reproduce a regular user's view.
 */
export async function evaluateFeatureAccess(params: FeatureAccessParams): Promise<GuardResult<FeatureAccessOutcome>> {
  const authResult = await authorizeUserResult(params.request ? { request: params.request } : undefined);
  if (!authResult.ok) {
    return denial('LOGIN_REQUIRED', authResult.message);
  }

  const userId = authResult.data.userId;
  const settings = await getSystemSettings();

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

  if (isGlobalAdmin && settings.superAdminBypassEnabled) {
    return {
      ok: true,
      data: {
        userId,
        featureKey: normalizedFeature,
        bypassReason: 'super_admin',
      },
    };
  }

  const globalEnabled = await FeatureFlagService.isGlobalFeatureEnabled(normalizedFeature);
  if (!globalEnabled) {
    return denial('FEATURE_DISABLED', `Feature disabled: ${normalizedFeature}`);
  }

  const requiresSubscription = params.requiresSubscription ?? false;
  const paywallEnabled = settings.subscriptionPaywallEnabled;

  if (params.clubId) {
    const outcome = await FeatureFlagService.evaluateClubFeature(params.clubId, normalizedFeature);
    if (outcome.kind === 'club_missing') {
      return denial('FEATURE_DISABLED', `Club not found for feature: ${normalizedFeature}`);
    }
    if (outcome.kind === 'subscription_required') {
      return denial('SUBSCRIPTION_REQUIRED', `Feature requires a higher subscription tier: ${normalizedFeature}`);
    }
    if (outcome.kind === 'club_not_eligible') {
      return denial('CLUB_NOT_ELIGIBLE', `Club not eligible for feature: ${normalizedFeature}`);
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

export const PAYWALLED_FEATURES = PAYWALLED_FEATURE_KEYS;
