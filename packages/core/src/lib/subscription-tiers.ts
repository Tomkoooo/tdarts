export type TierId = 'free' | 'basic' | 'pro' | 'enterprise';

export interface TierLimits {
  monthlyLiveTournaments: number;
  monthlySandboxTournaments: number;
  allowNonSandbox: boolean;
}

export interface TierFeatures {
  leagues: boolean;
  liveTracking: boolean;
  detailedStatistics: boolean;
}

export interface TierDefinition {
  id: TierId;
  limits: TierLimits;
  features: TierFeatures;
}

export const TIER_CONFIG: Record<TierId, TierDefinition> = {
  free: {
    id: 'free',
    limits: {
      monthlyLiveTournaments: 0,
      monthlySandboxTournaments: 5,
      allowNonSandbox: false,
    },
    features: {
      leagues: false,
      liveTracking: false,
      detailedStatistics: false,
    },
  },
  basic: {
    id: 'basic',
    limits: {
      monthlyLiveTournaments: 2,
      monthlySandboxTournaments: -1,
      allowNonSandbox: true,
    },
    features: {
      leagues: true,
      liveTracking: false,
      detailedStatistics: false,
    },
  },
  pro: {
    id: 'pro',
    limits: {
      monthlyLiveTournaments: 4,
      monthlySandboxTournaments: -1,
      allowNonSandbox: true,
    },
    features: {
      leagues: true,
      liveTracking: false,
      detailedStatistics: true,
    },
  },
  enterprise: {
    id: 'enterprise',
    limits: {
      monthlyLiveTournaments: -1,
      monthlySandboxTournaments: -1,
      allowNonSandbox: true,
    },
    features: {
      leagues: true,
      liveTracking: true,
      detailedStatistics: true,
    },
  },
};

export function getTierConfig(tierId: string): TierDefinition {
  return TIER_CONFIG[tierId as TierId] ?? TIER_CONFIG.free;
}
