import { connectMongo } from '@tdarts/core';
import { ClubModel } from '@tdarts/core';
import { BadRequestError } from '@tdarts/core';
import { TournamentModel } from '@tdarts/core';
import { isSubscriptionPaywallActive } from '@tdarts/core/subscription-paywall';
import { getTierConfig } from '@tdarts/core/subscription-tiers';
import type { TierDefinition } from '@tdarts/core/subscription-tiers';

export class SubscriptionService {
  static async getClubTier(clubId: string): Promise<TierDefinition> {
    await connectMongo();
    const club = await ClubModel.findById(clubId);
    if (!club) {
      throw new BadRequestError('Club not found', 'club', { clubId });
    }
    return getTierConfig(club.subscriptionModel || 'free');
  }

  static async canCreateTournament(
    clubId: string,
    tournamentStartDate: Date,
    isSandbox: boolean = false,
    isVerified: boolean = false
  ): Promise<{
    canCreate: boolean;
    currentCount: number;
    maxAllowed: number;
    tierName: string;
    errorMessage?: string;
  }> {
    try {
      if (!isSubscriptionPaywallActive()) {
        return { canCreate: true, currentCount: 0, maxAllowed: -1, tierName: 'Unlimited' };
      }

      await connectMongo();
      const tier = await this.getClubTier(clubId);
      const { limits } = tier;

      if (!isSandbox && !isVerified && !limits.allowNonSandbox) {
        return {
          canCreate: false,
          currentCount: 0,
          maxAllowed: 0,
          tierName: tier.id,
          errorMessage: `A ${tier.id} csomagban csak sandbox versenyek hozhatók létre. Frissítsd az előfizetésed a valódi versenyek létrehozásához.`,
        };
      }

      if (isVerified) {
        return { canCreate: true, currentCount: 0, maxAllowed: -1, tierName: tier.id };
      }

      const tournamentMonth = tournamentStartDate.getMonth();
      const tournamentYear = tournamentStartDate.getFullYear();
      const startOfMonth = new Date(tournamentYear, tournamentMonth, 1);
      const endOfMonth = new Date(tournamentYear, tournamentMonth + 1, 0, 23, 59, 59, 999);

      if (isSandbox) {
        const maxSandbox = limits.monthlySandboxTournaments;
        if (maxSandbox === -1) {
          return { canCreate: true, currentCount: 0, maxAllowed: -1, tierName: tier.id };
        }

        const sandboxCount = await TournamentModel.countDocuments({
          clubId,
          isSandbox: true,
          isDeleted: false,
          'tournamentSettings.startDate': { $gte: startOfMonth, $lte: endOfMonth },
        });

        return {
          canCreate: sandboxCount < maxSandbox,
          currentCount: sandboxCount,
          maxAllowed: maxSandbox,
          tierName: tier.id,
          errorMessage: sandboxCount >= maxSandbox
            ? `A ${tier.id} csomagban maximum ${maxSandbox} sandbox verseny hozható létre havonta. Jelenleg ${sandboxCount} sandbox verseny van ebben a hónapban.`
            : undefined,
        };
      }

      const maxLive = limits.monthlyLiveTournaments;
      if (maxLive === -1) {
        return { canCreate: true, currentCount: 0, maxAllowed: -1, tierName: tier.id };
      }

      const liveCount = await TournamentModel.countDocuments({
        clubId,
        isDeleted: false,
        isSandbox: { $ne: true },
        verified: { $ne: true },
        'tournamentSettings.startDate': { $gte: startOfMonth, $lte: endOfMonth },
      });

      return {
        canCreate: liveCount < maxLive,
        currentCount: liveCount,
        maxAllowed: maxLive,
        tierName: tier.id,
        errorMessage: liveCount >= maxLive
          ? `A ${tier.id} csomagban maximum ${maxLive} verseny hozható létre havonta. Jelenleg ${liveCount} verseny van ebben a hónapban.`
          : undefined,
      };
    } catch (error) {
      console.error('Error checking tournament creation permission:', error);
      return {
        canCreate: false,
        currentCount: 0,
        maxAllowed: 0,
        tierName: 'unknown',
        errorMessage: 'Hiba történt az előfizetés ellenőrzése során.',
      };
    }
  }

  static async canUpdateTournament(
    clubId: string,
    tournamentStartDate: Date,
    excludeTournamentId?: string
  ): Promise<{
    canUpdate: boolean;
    currentCount: number;
    maxAllowed: number;
    tierName: string;
    errorMessage?: string;
  }> {
    try {
      if (!isSubscriptionPaywallActive()) {
        return { canUpdate: true, currentCount: 0, maxAllowed: -1, tierName: 'Unlimited' };
      }

      await connectMongo();
      const tier = await this.getClubTier(clubId);
      const maxLive = tier.limits.monthlyLiveTournaments;

      if (maxLive === -1) {
        return { canUpdate: true, currentCount: 0, maxAllowed: -1, tierName: tier.id };
      }

      const tournamentMonth = tournamentStartDate.getMonth();
      const tournamentYear = tournamentStartDate.getFullYear();
      const startOfMonth = new Date(tournamentYear, tournamentMonth, 1);
      const endOfMonth = new Date(tournamentYear, tournamentMonth + 1, 0, 23, 59, 59, 999);

      const query: Record<string, unknown> = {
        clubId,
        isDeleted: false,
        isSandbox: { $ne: true },
        verified: { $ne: true },
        'tournamentSettings.startDate': { $gte: startOfMonth, $lte: endOfMonth },
      };

      if (excludeTournamentId) {
        query.tournamentId = { $ne: excludeTournamentId };
      }

      const liveCount = await TournamentModel.countDocuments(query);
      const canUpdate = liveCount < maxLive;

      return {
        canUpdate,
        currentCount: liveCount,
        maxAllowed: maxLive,
        tierName: tier.id,
        errorMessage: canUpdate
          ? undefined
          : `A ${tier.id} csomagban maximum ${maxLive} verseny hozható létre havonta. Jelenleg ${liveCount} verseny van ebben a hónapban.`,
      };
    } catch (error) {
      console.error('Error checking tournament update permission:', error);
      return {
        canUpdate: false,
        currentCount: 0,
        maxAllowed: 0,
        tierName: 'unknown',
        errorMessage: 'Hiba történt az előfizetés ellenőrzése során.',
      };
    }
  }
}
