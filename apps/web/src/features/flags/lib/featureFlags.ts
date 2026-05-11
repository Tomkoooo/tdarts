import { FEATURE_KEYS, normalizeFeatureKey } from '@/features/flags/lib/featureKeys';
import { getFeatureDefinition, toToggleKey } from '@/features/flags/lib/featureRegistry';
import { getSystemSettings } from '@tdarts/core/system-settings';
import { getTierConfig } from '@tdarts/core/subscription-tiers';

export interface FeatureFlags {
  liveMatchFollowing: boolean;
  advancedStatistics: boolean;
  leagues: boolean;
  oacCreation: boolean;
}

/**
 * Outcome of evaluating a feature against a single club. The structured shape
 * lets `evaluateFeatureAccess` emit a precise denial code (subscription vs
 * club-not-eligible vs feature-disabled) so the UI can render the right callout.
 */
export type ClubFeatureOutcome =
  | { kind: 'allowed' }
  | { kind: 'subscription_required'; reason: 'tier_lacks_feature' }
  | { kind: 'club_not_eligible'; reason: 'club_flag_off' | 'paywall_off_check_club_flag' }
  | { kind: 'club_missing' };

export class FeatureFlagService {
  /** True when the global toggle for this feature is ON in SystemSettings. */
  static async isGlobalFeatureEnabled(featureName: string): Promise<boolean> {
    const featureKey = normalizeFeatureKey(featureName);
    if (!featureKey) return false;
    if (!getFeatureDefinition(featureKey)) return false;

    const settings = await getSystemSettings();
    return settings.features[toToggleKey(featureKey)] === true;
  }

  /**
   * Returns a structured outcome for a (club, feature) pair. Does NOT consider
   * the global toggle — call {@link isGlobalFeatureEnabled} first.
   */
  static async evaluateClubFeature(clubId: string, featureName: string): Promise<ClubFeatureOutcome> {
    const featureKey = normalizeFeatureKey(featureName);
    if (!featureKey) return { kind: 'club_missing' };
    const def = getFeatureDefinition(featureKey);
    if (!def) return { kind: 'club_missing' };

    const settings = await getSystemSettings();
    const paywallEnabled = settings.subscriptionPaywallEnabled;

    const { ClubModel } = await import('@/database/models/club.model');
    const club = await ClubModel.findById(clubId).select('featureFlags subscriptionModel').lean();
    if (!club) return { kind: 'club_missing' };

    const clubFlags = (club as { featureFlags?: Record<string, boolean> }).featureFlags ?? {};
    const subscriptionModel = (club as { subscriptionModel?: string }).subscriptionModel || 'free';

    if (!paywallEnabled) {
      if (def.paywallOffBehavior === 'allow') return { kind: 'allowed' };
      if (def.clubFlagKey) {
        const enabled = clubFlags[def.clubFlagKey] === true;
        return enabled
          ? { kind: 'allowed' }
          : { kind: 'club_not_eligible', reason: 'paywall_off_check_club_flag' };
      }
      return { kind: 'allowed' };
    }

    if (def.tierEntitlement) {
      const tier = getTierConfig(subscriptionModel);
      if (!tier.features[def.tierEntitlement]) {
        return { kind: 'subscription_required', reason: 'tier_lacks_feature' };
      }
    }

    if (def.clubFlagKey) {
      const enabled = clubFlags[def.clubFlagKey] === true;
      return enabled
        ? { kind: 'allowed' }
        : { kind: 'club_not_eligible', reason: 'club_flag_off' };
    }

    return { kind: 'allowed' };
  }

  /** Boolean wrapper around {@link evaluateClubFeature}. */
  static async isClubFeatureEnabled(clubId: string, featureName: string): Promise<boolean> {
    const outcome = await this.evaluateClubFeature(clubId, featureName);
    return outcome.kind === 'allowed';
  }

  /**
   * Combined check: global toggle AND (if clubId provided) club eligibility.
   * Backward-compatible boolean API; prefer {@link evaluateClubFeature} when
   * you need to distinguish denial reasons.
   */
  static async isFeatureEnabled(featureName: string, clubId?: string): Promise<boolean> {
    const featureKey = normalizeFeatureKey(featureName);
    if (!featureKey) return false;
    if (!getFeatureDefinition(featureKey)) return false;

    const globalEnabled = await this.isGlobalFeatureEnabled(featureKey);
    if (!globalEnabled) return false;

    if (!clubId) return true;
    return this.isClubFeatureEnabled(clubId, featureKey);
  }

  static async isSocketEnabled(clubId?: string): Promise<boolean> {
    return this.isFeatureEnabled(FEATURE_KEYS.SOCKET, clubId);
  }
}
