import { FEATURE_KEYS, normalizeFeatureKey } from '@/features/flags/lib/featureKeys';
import { isSubscriptionPaywallActive } from '@/features/flags/lib/subscriptionPaywall';
import { getFeatureDefinition } from '@/features/flags/lib/featureRegistry';
import { getTierConfig } from '@tdarts/core/subscription-tiers';

export interface FeatureFlags {
  liveMatchFollowing: boolean;
  advancedStatistics: boolean;
  leagues: boolean;
  oacCreation: boolean;
}

export class FeatureFlagService {
  static isEnvFeatureEnabled(featureName: string): boolean {
    const featureKey = normalizeFeatureKey(featureName);
    if (!featureKey) return false;

    if (process.env.NEXT_PUBLIC_ENABLE_ALL === 'true') return true;

    const def = getFeatureDefinition(featureKey);
    if (!def) return false;

    const envValue = process.env[def.envVar];
    if (envValue === undefined) return def.envDefault;
    return envValue === 'true';
  }

  static async isClubFeatureEnabled(clubId: string, featureName: string): Promise<boolean> {
    const featureKey = normalizeFeatureKey(featureName);
    if (!featureKey) return false;

    const def = getFeatureDefinition(featureKey);
    if (!def) return false;

    try {
      const { ClubModel } = await import('@/database/models/club.model');
      const club = await ClubModel.findById(clubId).select('featureFlags subscriptionModel');
      if (!club) return false;

      if (!isSubscriptionPaywallActive()) {
        if (def.paywallOffBehavior === 'allow') return true;
        if (def.clubFlagKey) return club.featureFlags?.[def.clubFlagKey] === true;
        return false;
      }

      if (def.tierEntitlement) {
        const tier = getTierConfig(club.subscriptionModel || 'free');
        if (!tier.features[def.tierEntitlement]) return false;
      }

      if (def.clubFlagKey) {
        return club.featureFlags?.[def.clubFlagKey] === true;
      }

      return true;
    } catch (error) {
      console.error('Error checking club feature flag:', error);
      return false;
    }
  }

  static async isFeatureEnabled(featureName: string, clubId?: string): Promise<boolean> {
    const featureKey = normalizeFeatureKey(featureName);
    if (!featureKey) return false;

    const def = getFeatureDefinition(featureKey);
    if (!def) return false;

    const envEnabled = this.isEnvFeatureEnabled(featureKey);
    if (!envEnabled && featureKey !== FEATURE_KEYS.DETAILED_STATISTICS) return false;

    if (!clubId) return envEnabled;

    return this.isClubFeatureEnabled(clubId, featureKey);
  }

  static async isSocketEnabled(clubId?: string): Promise<boolean> {
    if (process.env.NEXT_PUBLIC_ENABLE_ALL === 'true') return true;

    const envSocketEnabled = this.isEnvFeatureEnabled(FEATURE_KEYS.SOCKET);
    if (!envSocketEnabled) return false;

    if (!clubId) return envSocketEnabled;

    return this.isClubFeatureEnabled(clubId, FEATURE_KEYS.SOCKET);
  }
}
