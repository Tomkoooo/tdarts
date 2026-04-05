import { FEATURE_KEYS, normalizeFeatureKey, toClubFeatureFlagKey } from '@/features/flags/lib/featureKeys';

export interface FeatureFlags {
  liveMatchFollowing: boolean;
  advancedStatistics: boolean;
  premiumTournaments: boolean;
  leagues: boolean;
  oacCreation: boolean;
}

export class FeatureFlagService {
  static isEnvFeatureEnabled(featureName: string): boolean {
    const featureKey = normalizeFeatureKey(featureName);
    if (!featureKey) {
      return false;
    }
    if (process.env.NEXT_PUBLIC_ENABLE_ALL === 'true') {
      return true;
    }

    switch (featureKey) {
      case FEATURE_KEYS.LIVE_MATCH_FOLLOWING:
        return process.env.NEXT_PUBLIC_ENABLE_LIVE_MATCH_FOLLOWING === 'true';
      case FEATURE_KEYS.ADVANCED_STATISTICS:
        return process.env.NEXT_PUBLIC_ENABLE_ADVANCED_STATISTICS === 'true';
      case FEATURE_KEYS.PREMIUM_TOURNAMENTS:
        return process.env.NEXT_PUBLIC_ENABLE_PREMIUM_TOURNAMENTS === 'true';
      case FEATURE_KEYS.LEAGUES:
        return process.env.NEXT_PUBLIC_ENABLE_LEAGUES === 'true';
      case FEATURE_KEYS.SOCKET:
        return process.env.NEXT_PUBLIC_ENABLE_SOCKET === 'true';
      case FEATURE_KEYS.OAC_CREATION:
        return process.env.NEXT_PUBLIC_ENABLE_OAC_CREATION === 'true' || process.env.NEXT_PUBLIC_ENABLE_OAC_CREATION === undefined;
      case FEATURE_KEYS.DETAILED_STATISTICS:
        return process.env.NEXT_PUBLIC_ENABLE_DETAILED_STATISTICS === 'true';
      default:
        return false;
    }
  }

  static async isClubFeatureEnabled(clubId: string, featureName: string): Promise<boolean> {
    const featureKey = normalizeFeatureKey(featureName);
    if (!featureKey) {
      return false;
    }

    try {
      const { ClubModel } = await import('@/database/models/club.model');
      const club = await ClubModel.findById(clubId).select('featureFlags subscriptionModel');
      if (!club) return false;

      if (process.env.NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED === 'false') {
        return true;
      }

      if (featureKey === FEATURE_KEYS.DETAILED_STATISTICS) {
        return club.subscriptionModel !== 'free' && !!club.subscriptionModel;
      }

      if (featureKey === FEATURE_KEYS.LEAGUES) {
        return club.subscriptionModel !== 'free';
      }

      if (!club.featureFlags) {
        return false;
      }

      const clubFeatureFlagKey = toClubFeatureFlagKey(featureKey);
      if (!clubFeatureFlagKey) {
        return false;
      }

      return club.featureFlags[clubFeatureFlagKey] === true;
    } catch (error) {
      console.error('Error checking club feature flag:', error);
      return false;
    }
  }

  static async isFeatureEnabled(featureName: string, clubId?: string): Promise<boolean> {
    const featureKey = normalizeFeatureKey(featureName);
    if (!featureKey) {
      return false;
    }

    if (process.env.NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED === 'false') {
      return true;
    }

    const envEnabled = this.isEnvFeatureEnabled(featureKey);
    if (!envEnabled && featureKey !== FEATURE_KEYS.DETAILED_STATISTICS) {
      return false;
    }

    if (!clubId) {
      return envEnabled;
    }

    return this.isClubFeatureEnabled(clubId, featureKey);
  }

  static async isSocketEnabled(clubId?: string): Promise<boolean> {
    if (process.env.NEXT_PUBLIC_ENABLE_ALL === 'true') {
      return true;
    }

    const envSocketEnabled = this.isEnvFeatureEnabled(FEATURE_KEYS.SOCKET);
    if (!envSocketEnabled) {
      return false;
    }

    if (!clubId) {
      return envSocketEnabled;
    }

    if (process.env.NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED === 'false') {
      return true;
    }

    try {
      const { ClubModel } = await import('@/database/models/club.model');
      const club = await ClubModel.findById(clubId).select('subscriptionModel');
      if (!club) {
        return false;
      }

      return club.subscriptionModel === 'enterprise';
    } catch (error) {
      console.error('Error checking club subscription:', error);
      return false;
    }
  }
}
