export const FEATURE_KEYS = {
  LIVE_MATCH_FOLLOWING: 'LIVE_MATCH_FOLLOWING',
  ADVANCED_STATISTICS: 'ADVANCED_STATISTICS',
  LEAGUES: 'LEAGUES',
  SOCKET: 'SOCKET',
  OAC_CREATION: 'OAC_CREATION',
  DETAILED_STATISTICS: 'DETAILED_STATISTICS',
} as const;

export type FeatureKey = (typeof FEATURE_KEYS)[keyof typeof FEATURE_KEYS];

const FEATURE_KEY_ALIASES: Record<string, FeatureKey> = {
  LIVE_MATCH_FOLLOWING: FEATURE_KEYS.LIVE_MATCH_FOLLOWING,
  LIVEMATCHFOLLOWING: FEATURE_KEYS.LIVE_MATCH_FOLLOWING,
  ADVANCED_STATISTICS: FEATURE_KEYS.ADVANCED_STATISTICS,
  ADVANCEDSTATISTICS: FEATURE_KEYS.ADVANCED_STATISTICS,
  LEAGUES: FEATURE_KEYS.LEAGUES,
  LEAGUESYSTEM: FEATURE_KEYS.LEAGUES,
  SOCKET: FEATURE_KEYS.SOCKET,
  OAC_CREATION: FEATURE_KEYS.OAC_CREATION,
  OACCREATION: FEATURE_KEYS.OAC_CREATION,
  DETAILED_STATISTICS: FEATURE_KEYS.DETAILED_STATISTICS,
  DETAILEDSTATISTICS: FEATURE_KEYS.DETAILED_STATISTICS,
};

function normalizeLookupKey(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

export function normalizeFeatureKey(featureName: string): FeatureKey | null {
  const raw = featureName.trim();
  if (!raw) {
    return null;
  }

  const direct = FEATURE_KEY_ALIASES[raw.toUpperCase()];
  if (direct) {
    return direct;
  }

  return FEATURE_KEY_ALIASES[normalizeLookupKey(raw)] ?? null;
}

export function toClubFeatureFlagKey(featureKey: FeatureKey): 'liveMatchFollowing' | 'advancedStatistics' | null {
  switch (featureKey) {
    case FEATURE_KEYS.LIVE_MATCH_FOLLOWING:
      return 'liveMatchFollowing';
    case FEATURE_KEYS.ADVANCED_STATISTICS:
      return 'advancedStatistics';
    case FEATURE_KEYS.LEAGUES:
    case FEATURE_KEYS.SOCKET:
    case FEATURE_KEYS.OAC_CREATION:
    case FEATURE_KEYS.DETAILED_STATISTICS:
      return null;
    default:
      return null;
  }
}
