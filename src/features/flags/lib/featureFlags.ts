export interface FeatureFlags {
  liveMatchFollowing: boolean;
  advancedStatistics: boolean;
  premiumTournaments: boolean;
  leagues: boolean;
  oacCreation: boolean;
}

export class FeatureFlagService {
  static isEnvFeatureEnabled(featureName: string): boolean {
    if (process.env.NEXT_PUBLIC_ENABLE_ALL === 'true') {
      return true;
    }

    switch (featureName) {
      case 'LIVE_MATCH_FOLLOWING':
        return process.env.NEXT_PUBLIC_ENABLE_LIVE_MATCH_FOLLOWING === 'true';
      case 'ADVANCED_STATISTICS':
        return process.env.NEXT_PUBLIC_ENABLE_ADVANCED_STATISTICS === 'true';
      case 'PREMIUM_TOURNAMENTS':
        return process.env.NEXT_PUBLIC_ENABLE_PREMIUM_TOURNAMENTS === 'true';
      case 'LEAGUES':
        return process.env.NEXT_PUBLIC_ENABLE_LEAGUES === 'true';
      case 'SOCKET':
        return process.env.NEXT_PUBLIC_ENABLE_SOCKET === 'true';
      case 'OAC_CREATION':
        return process.env.NEXT_PUBLIC_ENABLE_OAC_CREATION === 'true' || process.env.NEXT_PUBLIC_ENABLE_OAC_CREATION === undefined;
      case 'DETAILED_STATISTICS':
        return process.env.NEXT_PUBLIC_ENABLE_DETAILED_STATISTICS === 'true';
      default:
        return false;
    }
  }

  static async isClubFeatureEnabled(clubId: string, featureName: string): Promise<boolean> {
    try {
      const { ClubModel } = await import('@/database/models/club.model');
      const club = await ClubModel.findById(clubId).select('featureFlags subscriptionModel');
      if (!club) return false;

      if (process.env.NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED === 'false') {
        return true;
      }

      if (featureName === 'detailedStatistics') {
        return club.subscriptionModel !== 'free' && !!club.subscriptionModel;
      }

      if (featureName === 'leagues') {
        return club.subscriptionModel !== 'free';
      }

      if (!club.featureFlags) {
        return false;
      }

      return club.featureFlags[featureName as keyof typeof club.featureFlags] === true;
    } catch (error) {
      console.error('Error checking club feature flag:', error);
      return false;
    }
  }

  static async isFeatureEnabled(featureName: string, clubId?: string): Promise<boolean> {
    if (process.env.NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED === 'false') {
      return true;
    }

    const envEnabled = this.isEnvFeatureEnabled(featureName);
    if (!envEnabled && featureName !== 'detailedStatistics') {
      return false;
    }

    if (!clubId) {
      return envEnabled;
    }

    return this.isClubFeatureEnabled(clubId, featureName);
  }

  static async isSocketEnabled(clubId?: string): Promise<boolean> {
    if (process.env.NEXT_PUBLIC_ENABLE_ALL === 'true') {
      return true;
    }

    const envSocketEnabled = this.isEnvFeatureEnabled('SOCKET');
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
