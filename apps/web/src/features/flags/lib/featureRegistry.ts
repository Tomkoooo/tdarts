import type { TierFeatures } from '@tdarts/core/subscription-tiers';
import type { FeatureKey } from './featureKeys';
import { FEATURE_KEYS } from './featureKeys';

export type PaywallOffBehavior = 'allow' | 'check_club_flag';

export interface FeatureDefinition {
  key: FeatureKey;
  envVar: string;
  envDefault: boolean;
  tierEntitlement: keyof TierFeatures | null;
  clubFlagKey: 'liveMatchFollowing' | 'advancedStatistics' | null;
  paywallOffBehavior: PaywallOffBehavior;
  requiresSubscription: boolean;
}

export const FEATURE_REGISTRY: Record<FeatureKey, FeatureDefinition> = {
  [FEATURE_KEYS.SOCKET]: {
    key: FEATURE_KEYS.SOCKET,
    envVar: 'NEXT_PUBLIC_ENABLE_SOCKET',
    envDefault: false,
    tierEntitlement: 'liveTracking',
    clubFlagKey: null,
    paywallOffBehavior: 'allow',
    requiresSubscription: true,
  },
  [FEATURE_KEYS.LIVE_MATCH_FOLLOWING]: {
    key: FEATURE_KEYS.LIVE_MATCH_FOLLOWING,
    envVar: 'NEXT_PUBLIC_ENABLE_LIVE_MATCH_FOLLOWING',
    envDefault: false,
    tierEntitlement: 'liveTracking',
    clubFlagKey: 'liveMatchFollowing',
    paywallOffBehavior: 'allow',
    requiresSubscription: true,
  },
  [FEATURE_KEYS.LEAGUES]: {
    key: FEATURE_KEYS.LEAGUES,
    envVar: 'NEXT_PUBLIC_ENABLE_LEAGUES',
    envDefault: false,
    tierEntitlement: 'leagues',
    clubFlagKey: null,
    paywallOffBehavior: 'allow',
    requiresSubscription: true,
  },
  [FEATURE_KEYS.DETAILED_STATISTICS]: {
    key: FEATURE_KEYS.DETAILED_STATISTICS,
    envVar: 'NEXT_PUBLIC_ENABLE_DETAILED_STATISTICS',
    envDefault: false,
    tierEntitlement: 'detailedStatistics',
    clubFlagKey: 'advancedStatistics',
    paywallOffBehavior: 'check_club_flag',
    requiresSubscription: true,
  },
  [FEATURE_KEYS.ADVANCED_STATISTICS]: {
    key: FEATURE_KEYS.ADVANCED_STATISTICS,
    envVar: 'NEXT_PUBLIC_ENABLE_ADVANCED_STATISTICS',
    envDefault: false,
    tierEntitlement: 'detailedStatistics',
    clubFlagKey: 'advancedStatistics',
    paywallOffBehavior: 'check_club_flag',
    requiresSubscription: true,
  },
  [FEATURE_KEYS.OAC_CREATION]: {
    key: FEATURE_KEYS.OAC_CREATION,
    envVar: 'NEXT_PUBLIC_ENABLE_OAC_CREATION',
    envDefault: true,
    tierEntitlement: null,
    clubFlagKey: null,
    paywallOffBehavior: 'allow',
    requiresSubscription: false,
  },
};

export function getFeatureDefinition(key: string): FeatureDefinition | undefined {
  return FEATURE_REGISTRY[key as FeatureKey];
}

export const PAYWALLED_FEATURE_KEYS = new Set<string>(
  Object.values(FEATURE_REGISTRY)
    .filter(d => d.requiresSubscription)
    .map(d => d.key)
);
