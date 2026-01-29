export interface FeatureFlags {
  liveMatchFollowing: boolean;
  advancedStatistics: boolean;
  premiumTournaments: boolean;
  leagues: boolean;
  oacCreation: boolean;
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
    // FIGYELEM: Client oldalon a process.env[dynamicKey] nem működik!
    // Explicit módon kell hivatkozni a változókra.
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
        // Fallback logikát lehetne ide tenni, de client oldalon ez korlátozott
        return false;
    }
  }

  /**
   * Klub specifikus feature flag ellenőrzése adatbázisból
   */
  static async isClubFeatureEnabled(clubId: string, featureName: string): Promise<boolean> {
    try {
      // Dynamic import to keep this file client-safe
      const { ClubModel } = await import('@/database/models/club.model');
      
      const club = await ClubModel.findById(clubId).select('featureFlags subscriptionModel');
      if (!club) {
        return false;
      }

      // Ha a fizetős modell ki van kapcsolva, akkor minden feature elérhető
      if (process.env.NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED === 'false') {
        return true;
      }
      console.log(club.subscriptionModel, featureName)
      // Speciális kezelés a detailedStatistics feature-hez
      if (featureName === 'detailedStatistics') {
        console.log(`DEBUG: Club ${clubId} subscriptionModel: ${club.subscriptionModel}`);
        return club.subscriptionModel !== 'free' && !!club.subscriptionModel;
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
    // KIVÉVE: detailedStatistics - ezt mindig ellenőrizzük az adatbázisban ha van clubId
    if (!envEnabled && featureName !== 'detailedStatistics') {
      return false;
    }

    // Ha nincs clubId, akkor csak ENV alapú ellenőrzés
    if (!clubId) {
      return envEnabled;
    }

    // Klub specifikus ellenőrzés
    const clubEnabled = await this.isClubFeatureEnabled(clubId, featureName);
    console.log(clubEnabled)
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
 