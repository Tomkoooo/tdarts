import { connectMongo } from '@/lib/mongoose';
import { ClubModel } from '@/database/models/club.model';
import { TournamentModel } from '@/database/models/tournament.model';
import { BadRequestError } from '@/middleware/errorHandle';

export interface SubscriptionPlan {
  name: string;
  monthlyTournaments: number; // -1 means unlimited
  features: string[];
  allowNonSandbox: boolean; // If false, can only create sandbox tournaments
  allowVerified: boolean; // If false, cannot create verified/OAC tournaments
}

/**
 * Subscription plan configuration
 * Easy to modify for different tier restrictions
 * 
 * To restrict free tier to sandbox-only: set allowNonSandbox to false
 * To prevent a tier from creating OAC tournaments: set allowVerified to false
 */
export const SUBSCRIPTION_PLANS: Record<string, SubscriptionPlan> = {
  free: {
    name: 'Ingyenes',
    monthlyTournaments: 1,
    allowNonSandbox: true, // Change to false to restrict to sandbox-only
    allowVerified: true, // OAC tournaments are allowed (they don't count towards limit)
    features: ['Havi 1 verseny/klub', 'Korlátlan felhasználó']
  },
  basic: {
    name: 'Alap',
    monthlyTournaments: 2,
    allowNonSandbox: true,
    allowVerified: true,
    features: ['Havi 2 verseny/klub', 'Korlátlan felhasználó', 'Liga indítási lehetőség']
  },
  pro: {
    name: 'Pro',
    monthlyTournaments: 4,
    allowNonSandbox: true,
    allowVerified: true,
    features: ['Havi 4 verseny/klub', 'Korlátlan felhasználó', 'Liga indítási lehetőség', 'Részletes leg statisztikák']
  },
  enterprise: {
    name: 'Enterprise',
    monthlyTournaments: -1, // -1 means unlimited
    allowNonSandbox: true,
    allowVerified: true,
    features: ['Korlátlan havi verseny', 'Korlátlan felhasználó', 'Elő meccs követés', 'Liga indítási lehetőség', 'Részletes leg statisztikák']
  }
};

export class SubscriptionService {
  /**
   * Get the subscription plan for a club
   */
  static async getClubSubscriptionPlan(clubId: string): Promise<SubscriptionPlan> {
    try {
      await connectMongo();
      const club = await ClubModel.findById(clubId);
      
      if (!club) {
        throw new BadRequestError('Club not found', 'club', {
          clubId
        });
      }

      // Get subscription plan from database
      const subscriptionModel = club.subscriptionModel || 'free';
      
      // Map database values to subscription plans
      switch (subscriptionModel) {
        case 'basic':
          return SUBSCRIPTION_PLANS.basic;
        case 'pro':
          return SUBSCRIPTION_PLANS.pro;
        case 'enterprise':
          return SUBSCRIPTION_PLANS.enterprise;
        case 'free':
        default:
          return SUBSCRIPTION_PLANS.free;
      }
    } catch (error) {
      console.error('Error getting club subscription plan:', error);
      return SUBSCRIPTION_PLANS.free;
    }
  }

  /**
   * Check if a club can create a tournament in the given month
   * @param isSandbox - Whether the tournament being created is sandbox
   * @param isVerified - Whether the tournament being created is verified/OAC
   */
  static async canCreateTournament(
    clubId: string, 
    tournamentStartDate: Date,
    isSandbox: boolean = false,
    isVerified: boolean = false
  ): Promise<{
    canCreate: boolean;
    currentCount: number;
    maxAllowed: number;
    planName: string;
    errorMessage?: string;
  }> {
    try {
      // Check if subscription feature is enabled
      const isSubscriptionEnabled = process.env.NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED === 'true';
      
      if (!isSubscriptionEnabled) {
        // If subscription is disabled, always allow
        return {
          canCreate: true,
          currentCount: 0,
          maxAllowed: -1,
          planName: 'Korlátlan'
        };
      }

      await connectMongo();
      
      const subscriptionPlan = await this.getClubSubscriptionPlan(clubId);
      
      // Check sandbox restriction
      if (!isSandbox && !isVerified && !subscriptionPlan.allowNonSandbox) {
        return {
          canCreate: false,
          currentCount: 0,
          maxAllowed: 0,
          planName: subscriptionPlan.name,
          errorMessage: `A ${subscriptionPlan.name} csomagban csak sandbox versenyek hozhatók létre. Frissítsd az előfizetésed a valódi versenyek létrehozásához.`
        };
      }

      // Check verified tournament restriction
      if (isVerified && !subscriptionPlan.allowVerified) {
        return {
          canCreate: false,
          currentCount: 0,
          maxAllowed: 0,
          planName: subscriptionPlan.name,
          errorMessage: `A ${subscriptionPlan.name} csomagban nem hozhatók létre OAC versenyek. Frissítsd az előfizetésed.`
        };
      }

      const maxAllowed = subscriptionPlan.monthlyTournaments;
      
      // Sandbox and verified tournaments don't count towards monthly limit
      if (isSandbox || isVerified) {
        return {
          canCreate: true,
          currentCount: 0,
          maxAllowed,
          planName: subscriptionPlan.name
        };
      }
      
      // If unlimited, always allow
      if (maxAllowed === -1) {
        return {
          canCreate: true,
          currentCount: 0,
          maxAllowed: -1,
          planName: subscriptionPlan.name
        };
      }

      // Get the month and year of the tournament start date
      const tournamentMonth = tournamentStartDate.getMonth();
      const tournamentYear = tournamentStartDate.getFullYear();

      // Count tournaments created in the same month
      // Exclude sandbox and verified tournaments
      const startOfMonth = new Date(tournamentYear, tournamentMonth, 1);
      const endOfMonth = new Date(tournamentYear, tournamentMonth + 1, 0, 23, 59, 59, 999);

      const tournamentsInMonth = await TournamentModel.countDocuments({
        clubId: clubId,
        'tournamentSettings.startDate': {
          $gte: startOfMonth,
          $lte: endOfMonth
        },
        isDeleted: false,
        isSandbox: { $ne: true },
        verified: { $ne: true } // Exclude verified OAC tournaments
      });

      const canCreate = tournamentsInMonth < maxAllowed;

      return {
        canCreate,
        currentCount: tournamentsInMonth,
        maxAllowed,
        planName: subscriptionPlan.name,
        errorMessage: canCreate ? undefined : 
          `A ${subscriptionPlan.name} csomagban maximum ${maxAllowed} verseny hozható létre havonta. Jelenleg ${tournamentsInMonth} verseny van ebben a hónapban.`
      };
    } catch (error) {
      console.error('Error checking tournament creation permission:', error);
      return {
        canCreate: false,
        currentCount: 0,
        maxAllowed: 0,
        planName: 'Ismeretlen',
        errorMessage: 'Hiba történt az előfizetés ellenőrzése során.'
      };
    }
  }

  /**
   * Check if a club can update a tournament (same logic as creation)
   */
  static async canUpdateTournament(clubId: string, tournamentStartDate: Date, excludeTournamentId?: string): Promise<{
    canUpdate: boolean;
    currentCount: number;
    maxAllowed: number;
    planName: string;
    errorMessage?: string;
  }> {
    try {
      // Check if subscription feature is enabled
      const isSubscriptionEnabled = process.env.NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED === 'true';
      
      if (!isSubscriptionEnabled) {
        // If subscription is disabled, always allow
        return {
          canUpdate: true,
          currentCount: 0,
          maxAllowed: -1,
          planName: 'Korlátlan'
        };
      }

      await connectMongo();
      
      const subscriptionPlan = await this.getClubSubscriptionPlan(clubId);
      const maxAllowed = subscriptionPlan.monthlyTournaments;
      
      // If unlimited, always allow
      if (maxAllowed === -1) {
        return {
          canUpdate: true,
          currentCount: 0,
          maxAllowed: -1,
          planName: subscriptionPlan.name
        };
      }

      // Get the month and year of the tournament start date
      const tournamentMonth = tournamentStartDate.getMonth();
      const tournamentYear = tournamentStartDate.getFullYear();

      // Count tournaments created in the same month (excluding the current tournament if updating)
      const startOfMonth = new Date(tournamentYear, tournamentMonth, 1);
      const endOfMonth = new Date(tournamentYear, tournamentMonth + 1, 0, 23, 59, 59, 999);

      const query: any = {
        clubId: clubId,
        isDeleted: false,
        isSandbox: { $ne: true },
        verified: { $ne: true } // Exclude verified OAC tournaments
      };

      // Only check start date if it's being changed
      if (tournamentStartDate) {
        query['tournamentSettings.startDate'] = {
          $gte: startOfMonth,
          $lte: endOfMonth
        };
      }

      // Exclude current tournament if updating
      if (excludeTournamentId) {
        query.tournamentId = { $ne: excludeTournamentId };
      }

      const tournamentsInMonth = await TournamentModel.countDocuments(query);

      const canUpdate = tournamentsInMonth < maxAllowed;

      return {
        canUpdate,
        currentCount: tournamentsInMonth,
        maxAllowed,
        planName: subscriptionPlan.name,
        errorMessage: canUpdate ? undefined : 
          `A ${subscriptionPlan.name} csomagban maximum ${maxAllowed} verseny hozható létre havonta. Jelenleg ${tournamentsInMonth} verseny van ebben a hónapban.`
      };
    } catch (error) {
      console.error('Error checking tournament update permission:', error);
      return {
        canUpdate: false,
        currentCount: 0,
        maxAllowed: 0,
        planName: 'Ismeretlen',
        errorMessage: 'Hiba történt az előfizetés ellenőrzése során.'
      };
    }
  }
}
