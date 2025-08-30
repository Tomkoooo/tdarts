// ClubModel importálása csak akkor, amikor szükséges (backend oldalon)
let ClubModel: any = null;

// Dinamikus import a backend oldalon
const getClubModel = async () => {
  if (!ClubModel) {
    try {
      const { ClubModel: Model } = await import('@/database/models/club.model');
      ClubModel = Model;
    } catch (error) {
      console.error('Failed to import ClubModel:', error);
      return null;
    }
  }
  return ClubModel;
};

export interface FeatureFlags {
  liveMatchFollowing: boolean;
  advancedStatistics: boolean;
  premiumTournaments: boolean;
  leagueSystem: boolean; // Liga rendszer
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
      // Dinamikus import a backend oldalon
      const ClubModel = await getClubModel();
      if (!ClubModel) {
        console.warn('ClubModel not available, falling back to ENV check');
        return this.isEnvFeatureEnabled(featureName);
      }

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

      // Ha nincs featureFlags mező, akkor alapértelmezetten false
      if (!club.featureFlags) {
        return false;
      }

      return club.featureFlags[featureName as keyof typeof club.featureFlags] === true;
    } catch (error) {
      console.error('Error checking club feature flag:', error);
      // Fallback az ENV alapú ellenőrzésre
      return this.isEnvFeatureEnabled(featureName);
    }
  }

  /**
   * Kombinált feature flag ellenőrzés
   * Először ENV-t ellenőrzi, majd ha szükséges, adatbázist is
   */
  static async isFeatureEnabled(featureName: string, clubId?: string): Promise<boolean> {
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

    // Ha a fizetős modell ki van kapcsolva, akkor minden feature elérhető
    if (process.env.NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED === 'false') {
      return true;
    }

    // Ha van clubId, akkor klub specifikus ellenőrzés
    if (clubId) {
      return await this.isClubFeatureEnabled(clubId, 'SOCKET');
    }

    return envSocketEnabled;
  }

  /**
   * Liga rendszer elérhetőségének ellenőrzése
   */
  static async isLeagueSystemEnabled(clubId?: string): Promise<boolean> {
    // Ha a fizetős modell ki van kapcsolva, akkor minden feature elérhető
    if (process.env.NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED === 'false') {
      return true;
    }

    // ENV alapú liga ellenőrzés
    const envLeagueEnabled = this.isEnvFeatureEnabled('LEAGUE_SYSTEM');
    
    // Ha ENV alapú flag false, akkor adatbázist sem ellenőrizzük
    if (!envLeagueEnabled) {
      return false;
    }

    // Ha van clubId, akkor klub specifikus ellenőrzés
    if (clubId) {
      return await this.isClubFeatureEnabled(clubId, 'leagueSystem');
    }

    return envLeagueEnabled;
  }
} 