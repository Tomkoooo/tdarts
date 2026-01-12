import { ClubModel } from '@/database/models/club.model';

export interface FeatureFlags {
  liveMatchFollowing: boolean;
  advancedStatistics: boolean;
  premiumTournaments: boolean;
  leagues: boolean;
  // További flag-ek ide jöhetnek
}

export class FeatureFlagService {
  /**
   * ENV alapú feature flag ellenőrzése
   */
  static isEnvFeatureEnabled(featureName: string): boolean {
    // Ha NEXT_PUBLIC_ENABLE_ALL true, akkor minden feature elérhető
    if (process.env.NEXT_PUBLIC_ENABLE_ALL === 'true') {
      return true;
    }

    // Egyedi feature flag ellenőrzése
    const envVarName = `NEXT_PUBLIC_ENABLE_${featureName.toUpperCase()}`;
    const envValue = process.env[envVarName];
    
    // Ha nincs definiálva, akkor alapértelmezetten false
    if (envValue === undefined) {
      return false;
    }
    
    return envValue.toLowerCase() === 'true';
  }

  /**
   * Klub specifikus feature flag ellenőrzése adatbázisból
   */
  static async isClubFeatureEnabled(clubId: string, featureName: string): Promise<boolean> {
    try {
      const club = await ClubModel.findById(clubId).select('featureFlags subscriptionModel');
      if (!club) {
        return false;
      }

      // Ha a fizetős modell ki van kapcsolva, akkor minden feature elérhető
      if (process.env.NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED === 'false') {
        return true;
      }

      // Speciális kezelés a detailedStatistics feature-hez
      if (featureName === 'detailedStatistics') {
        return club.subscriptionModel === 'pro';
      }

      // Speciális kezelés a leagues feature-hez - csak prémium előfizetéseknek
      if (featureName === 'leagues') {
        return club.subscriptionModel !== 'free';
      }

      // Ha nincs featureFlags mező, akkor alapértelmezetten false
      if (!club.featureFlags) {
        return false;
      }

      return club.featureFlags[featureName as keyof typeof club.featureFlags] === true;
    } catch (error) {
      console.error('Error checking club feature flag:', error);
      return false;
    }
  }

  /**
   * Kombinált feature flag ellenőrzés
   * Először ENV-t ellenőrzi, majd ha szükséges, adatbázist is
   */
  static async isFeatureEnabled(featureName: string, clubId?: string): Promise<boolean> {
    // Ha a fizetős modell ki van kapcsolva, akkor minden feature elérhető
    if (process.env.NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED === 'false') {
      return true;
    }

    // ENV alapú ellenőrzés
    const envEnabled = this.isEnvFeatureEnabled(featureName);
    
    // Ha ENV alapú flag false, akkor adatbázist sem ellenőrizzük
    if (!envEnabled) {
      return false;
    }

    // Ha nincs clubId, akkor csak ENV alapú ellenőrzés
    if (!clubId) {
      return envEnabled;
    }

    // Klub specifikus ellenőrzés
    const clubEnabled = await this.isClubFeatureEnabled(clubId, featureName);
    return clubEnabled;
  }

  /**
   * Socket kapcsolat ellenőrzése speciális logikával
   */
  static async isSocketEnabled(clubId?: string): Promise<boolean> {
    // Ha NEXT_PUBLIC_ENABLE_ALL true, akkor mindenképp engedélyezett
    if (process.env.NEXT_PUBLIC_ENABLE_ALL === 'true') {
      return true;
    }

    // ENV alapú socket ellenőrzés
    const envSocketEnabled = this.isEnvFeatureEnabled('SOCKET');
    
    // Ha ENV alapú flag false, akkor adatbázist sem ellenőrizzük
    if (!envSocketEnabled) {
      return false;
    }

    // Ha nincs clubId, akkor csak ENV alapú ellenőrzés
    if (!clubId) {
      return envSocketEnabled;
    }

    // Ha a fizetős modell ki van kapcsolva, akkor mindenképp engedélyezett
    if (process.env.NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED === 'false') {
      return true;
    }

    // Klub specifikus ellenőrzés - subscriptionModel === 'pro'
    try {
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