import { connectMongo } from '@/lib/mongoose';
import { ClubModel } from '@/database/models/club.model';
import { TournamentModel } from '@/database/models/tournament.model';
import { BadRequestError } from '@/middleware/errorHandle';

export interface SubscriptionPlan {
  name: string;
  monthlyTournaments: number;
  features: string[];
}

export const SUBSCRIPTION_PLANS: Record<string, SubscriptionPlan> = {
  free: {
    name: 'Ingyenes',
    monthlyTournaments: 1,
    features: ['Havi 1 verseny/klub', 'Korlátlan felhasználó']
  },
  basic: {
    name: 'Alap',
    monthlyTournaments: 2,
    features: ['Havi 2 verseny/klub', 'Korlátlan felhasználó', 'Liga indítási lehetőség']
  },
  pro: {
    name: 'Pro',
    monthlyTournaments: 4,
    features: ['Havi 4 verseny/klub', 'Korlátlan felhasználó', 'Liga indítási lehetőség', 'Részletes leg statisztikák']
  },
  enterprise: {
    name: 'Enterprise',
    monthlyTournaments: -1, // -1 means unlimited
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
   */
  static async canCreateTournament(clubId: string, tournamentStartDate: Date): Promise<{
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
      const maxAllowed = subscriptionPlan.monthlyTournaments;
      
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
      const startOfMonth = new Date(tournamentYear, tournamentMonth, 1);
      const endOfMonth = new Date(tournamentYear, tournamentMonth + 1, 0, 23, 59, 59, 999);

      const tournamentsInMonth = await TournamentModel.countDocuments({
        clubId: clubId,
        'tournamentSettings.startDate': {
          $gte: startOfMonth,
          $lte: endOfMonth
        },
        isDeleted: false,
        isSandbox: { $ne: true }
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
        isSandbox: { $ne: true }
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
