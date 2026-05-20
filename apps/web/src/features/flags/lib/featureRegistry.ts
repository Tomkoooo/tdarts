import type { TierFeatures } from '@tdarts/core/subscription-tiers';
import type { FeatureToggleKey } from '@/database/models/system-settings.model';
import type { FeatureKey } from './featureKeys';
import { FEATURE_KEYS } from './featureKeys';

export type PaywallOffBehavior = 'allow' | 'check_club_flag';

export interface FeatureDefinition {
  key: FeatureKey;
  /**
   * Tier-feature this gate consults when the subscription paywall is ON.
   * `null` means the feature is not gated by tier (still gated by global toggle).
   */
  tierEntitlement: keyof TierFeatures | null;
  /** Per-club override flag in `club.featureFlags`, if any. */
  clubFlagKey: 'liveMatchFollowing' | 'advancedStatistics' | null;
  /** Behavior when the paywall toggle is OFF. */
  paywallOffBehavior: PaywallOffBehavior;
  /** Whether the feature requires a paid subscription tier when the paywall is on. */
  requiresSubscription: boolean;
}

/**
 * Static metadata only. Per-feature on/off lives in the `SystemSettings` DB doc
 * (see {@link import('@tdarts/core/system-settings').getSystemSettings}). The
 * registry maps logical feature keys to tier entitlements and per-club flag
 * names so we can decide WHY a feature is denied (subscription vs club flag).
 */
export const FEATURE_REGISTRY: Record<FeatureKey, FeatureDefinition> = {
  [FEATURE_KEYS.ADS]: {
    key: FEATURE_KEYS.ADS,
    tierEntitlement: null,
    clubFlagKey: null,
    paywallOffBehavior: 'allow',
    requiresSubscription: false,
  },
  [FEATURE_KEYS.ADS_PLACEHOLDER]: {
    key: FEATURE_KEYS.ADS_PLACEHOLDER,
    tierEntitlement: null,
    clubFlagKey: null,
    paywallOffBehavior: 'allow',
    requiresSubscription: false,
  },
  [FEATURE_KEYS.SOCKET]: {
    key: FEATURE_KEYS.SOCKET,
    tierEntitlement: 'liveTracking',
    clubFlagKey: null,
    paywallOffBehavior: 'allow',
    requiresSubscription: true,
  },
  [FEATURE_KEYS.LIVE_MATCH_FOLLOWING]: {
    key: FEATURE_KEYS.LIVE_MATCH_FOLLOWING,
    tierEntitlement: 'liveTracking',
    clubFlagKey: 'liveMatchFollowing',
    paywallOffBehavior: 'allow',
    requiresSubscription: true,
  },
  [FEATURE_KEYS.LEAGUES]: {
    key: FEATURE_KEYS.LEAGUES,
    tierEntitlement: 'leagues',
    clubFlagKey: null,
    paywallOffBehavior: 'allow',
    requiresSubscription: true,
  },
  [FEATURE_KEYS.DETAILED_STATISTICS]: {
    key: FEATURE_KEYS.DETAILED_STATISTICS,
    tierEntitlement: 'detailedStatistics',
    clubFlagKey: 'advancedStatistics',
    paywallOffBehavior: 'check_club_flag',
    requiresSubscription: true,
  },
  [FEATURE_KEYS.ADVANCED_STATISTICS]: {
    key: FEATURE_KEYS.ADVANCED_STATISTICS,
    tierEntitlement: 'detailedStatistics',
    clubFlagKey: 'advancedStatistics',
    paywallOffBehavior: 'check_club_flag',
    requiresSubscription: true,
  },
  [FEATURE_KEYS.OAC_CREATION]: {
    key: FEATURE_KEYS.OAC_CREATION,
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

/**
 * Maps internal feature keys to the {@link FeatureToggleKey} stored in
 * `SystemSettings.features`. The mapping is intentionally identity for now —
 * keep this helper to make it explicit at boundaries.
 */
export function toToggleKey(featureKey: FeatureKey): FeatureToggleKey {
  return featureKey as FeatureToggleKey;
}
