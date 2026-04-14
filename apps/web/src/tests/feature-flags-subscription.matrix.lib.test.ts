/**
 * Feature flag tests aligned with the feature registry and TIER_CONFIG.
 * All env vars set explicitly -- NO reliance on .env or NEXT_PUBLIC_ENABLE_ALL.
 */
import { ClubModel } from '@tdarts/core';
import { FeatureFlagService } from '@/features/flags/lib/featureFlags';
import { isSubscriptionPaywallActive } from '@tdarts/core/subscription-paywall';
import { FEATURE_REGISTRY } from '@/features/flags/lib/featureRegistry';
import { FEATURE_KEYS } from '@/features/flags/lib/featureKeys';

const ALL_ENV_KEYS = [
  'NEXT_PUBLIC_ENABLE_ALL',
  'NEXT_PUBLIC_ENABLE_SOCKET',
  'NEXT_PUBLIC_ENABLE_LEAGUES',
  'NEXT_PUBLIC_ENABLE_LIVE_MATCH_FOLLOWING',
  'NEXT_PUBLIC_ENABLE_DETAILED_STATISTICS',
  'NEXT_PUBLIC_ENABLE_ADVANCED_STATISTICS',
  'NEXT_PUBLIC_ENABLE_OAC_CREATION',
  'NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED',
] as const;

function snapshotEnv() {
  const s: Record<string, string | undefined> = {};
  for (const k of ALL_ENV_KEYS) s[k] = process.env[k];
  return s;
}

function restoreEnv(s: Record<string, string | undefined>) {
  for (const k of ALL_ENV_KEYS) {
    if (s[k] === undefined) Reflect.deleteProperty(process.env, k);
    else process.env[k] = s[k];
  }
}

function clearAllFeatureEnvs() {
  for (const k of ALL_ENV_KEYS) Reflect.deleteProperty(process.env, k);
}

const PROD_ENV: Record<string, string> = {
  NEXT_PUBLIC_ENABLE_LEAGUES: 'true',
  NEXT_PUBLIC_ENABLE_SOCKET: 'true',
  NEXT_PUBLIC_ENABLE_OAC_CREATION: 'true',
  NEXT_PUBLIC_ENABLE_DETAILED_STATISTICS: 'true',
  NEXT_PUBLIC_ENABLE_LIVE_MATCH_FOLLOWING: 'true',
  NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED: 'false',
};

function applyProdEnv() {
  clearAllFeatureEnvs();
  for (const [k, v] of Object.entries(PROD_ENV)) {
    process.env[k] = v;
  }
}

describe('isSubscriptionPaywallActive', () => {
  let snap: Record<string, string | undefined>;
  beforeEach(() => { snap = snapshotEnv(); });
  afterEach(() => { restoreEnv(snap); });

  it('active only for exact "true"', () => {
    process.env.NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED = 'true';
    expect(isSubscriptionPaywallActive()).toBe(true);
  });

  it.each(['false', '', 'True', '1'])('inactive for %p', (val) => {
    process.env.NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED = val;
    expect(isSubscriptionPaywallActive()).toBe(false);
  });

  it('inactive when unset', () => {
    Reflect.deleteProperty(process.env, 'NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED');
    expect(isSubscriptionPaywallActive()).toBe(false);
  });
});

describe('Feature registry completeness', () => {
  it('every FEATURE_KEY has a registry entry', () => {
    for (const key of Object.values(FEATURE_KEYS)) {
      expect(FEATURE_REGISTRY[key]).toBeDefined();
    }
  });

  it('every registry entry has a valid envVar', () => {
    for (const def of Object.values(FEATURE_REGISTRY)) {
      expect(def.envVar).toMatch(/^NEXT_PUBLIC_ENABLE_/);
    }
  });

  it('PREMIUM_TOURNAMENTS does not exist in registry or keys', () => {
    expect((FEATURE_KEYS as Record<string, string>)['PREMIUM_TOURNAMENTS']).toBeUndefined();
    expect(FEATURE_REGISTRY['PREMIUM_TOURNAMENTS' as keyof typeof FEATURE_REGISTRY]).toBeUndefined();
  });
});

describe('Production env mirror (no ENABLE_ALL)', () => {
  let snap: Record<string, string | undefined>;

  beforeEach(async () => {
    snap = snapshotEnv();
    applyProdEnv();
    await ClubModel.deleteMany({ name: /^ff-prod-/ });
  });

  afterEach(async () => {
    await ClubModel.deleteMany({ name: /^ff-prod-/ });
    restoreEnv(snap);
  });

  it('ENABLE_ALL is NOT set', () => {
    expect(process.env.NEXT_PUBLIC_ENABLE_ALL).toBeUndefined();
  });

  it('SOCKET enabled at env level', () => {
    expect(FeatureFlagService.isEnvFeatureEnabled('SOCKET')).toBe(true);
  });

  it('LEAGUES enabled at env level', () => {
    expect(FeatureFlagService.isEnvFeatureEnabled('LEAGUES')).toBe(true);
  });

  it('DETAILED_STATISTICS enabled at env level', () => {
    expect(FeatureFlagService.isEnvFeatureEnabled('DETAILED_STATISTICS')).toBe(true);
  });

  it('LIVE_MATCH_FOLLOWING enabled at env level', () => {
    expect(FeatureFlagService.isEnvFeatureEnabled('LIVE_MATCH_FOLLOWING')).toBe(true);
  });

  it('OAC_CREATION enabled at env level', () => {
    expect(FeatureFlagService.isEnvFeatureEnabled('OAC_CREATION')).toBe(true);
  });

  it('paywall off: socket enabled for any club without liveMatchFollowing flag', async () => {
    const club = await ClubModel.create({
      name: 'ff-prod-socket',
      description: 'Test',
      location: 'Test',
      subscriptionModel: 'free',
      featureFlags: { liveMatchFollowing: false, advancedStatistics: false },
      admin: [],
    });
    await expect(FeatureFlagService.isSocketEnabled(club._id.toString())).resolves.toBe(true);
  });

  it('paywall off: leagues enabled for free club', async () => {
    const club = await ClubModel.create({
      name: 'ff-prod-leagues',
      description: 'Test',
      location: 'Test',
      subscriptionModel: 'free',
      admin: [],
    });
    await expect(FeatureFlagService.isFeatureEnabled('LEAGUES', club._id.toString())).resolves.toBe(true);
  });
});

describe('Feature flags with paywall ON - tier-based entitlements', () => {
  let snap: Record<string, string | undefined>;

  beforeEach(async () => {
    snap = snapshotEnv();
    clearAllFeatureEnvs();
    process.env.NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED = 'true';
    process.env.NEXT_PUBLIC_ENABLE_LEAGUES = 'true';
    process.env.NEXT_PUBLIC_ENABLE_SOCKET = 'true';
    process.env.NEXT_PUBLIC_ENABLE_DETAILED_STATISTICS = 'true';
    process.env.NEXT_PUBLIC_ENABLE_LIVE_MATCH_FOLLOWING = 'true';
    await ClubModel.deleteMany({ name: /^ff-tier-/ });
  });

  afterEach(async () => {
    await ClubModel.deleteMany({ name: /^ff-tier-/ });
    restoreEnv(snap);
  });

  it('free club cannot access leagues', async () => {
    const club = await ClubModel.create({
      name: 'ff-tier-free-leagues',
      description: 'Test',
      location: 'Test',
      subscriptionModel: 'free',
      admin: [],
    });
    await expect(FeatureFlagService.isFeatureEnabled('LEAGUES', club._id.toString())).resolves.toBe(false);
  });

  it('basic club can access leagues', async () => {
    const club = await ClubModel.create({
      name: 'ff-tier-basic-leagues',
      description: 'Test',
      location: 'Test',
      subscriptionModel: 'basic',
      admin: [],
    });
    await expect(FeatureFlagService.isFeatureEnabled('LEAGUES', club._id.toString())).resolves.toBe(true);
  });

  it('free club cannot access socket (liveTracking not in free tier)', async () => {
    const club = await ClubModel.create({
      name: 'ff-tier-free-socket',
      description: 'Test',
      location: 'Test',
      subscriptionModel: 'free',
      admin: [],
    });
    await expect(FeatureFlagService.isSocketEnabled(club._id.toString())).resolves.toBe(false);
  });

  it('enterprise club can access socket', async () => {
    const club = await ClubModel.create({
      name: 'ff-tier-ent-socket',
      description: 'Test',
      location: 'Test',
      subscriptionModel: 'enterprise',
      admin: [],
    });
    await expect(FeatureFlagService.isSocketEnabled(club._id.toString())).resolves.toBe(true);
  });

  it('pro club can access detailed statistics with advancedStatistics flag', async () => {
    const club = await ClubModel.create({
      name: 'ff-tier-pro-stats',
      description: 'Test',
      location: 'Test',
      subscriptionModel: 'pro',
      featureFlags: { advancedStatistics: true, liveMatchFollowing: false },
      admin: [],
    });
    await expect(FeatureFlagService.isFeatureEnabled('DETAILED_STATISTICS', club._id.toString())).resolves.toBe(true);
  });

  it('pro club without advancedStatistics flag cannot access detailed statistics', async () => {
    const club = await ClubModel.create({
      name: 'ff-tier-pro-stats-no',
      description: 'Test',
      location: 'Test',
      subscriptionModel: 'pro',
      featureFlags: { advancedStatistics: false, liveMatchFollowing: false },
      admin: [],
    });
    await expect(FeatureFlagService.isFeatureEnabled('DETAILED_STATISTICS', club._id.toString())).resolves.toBe(false);
  });

  it('free club cannot access detailed statistics even with advancedStatistics flag', async () => {
    const club = await ClubModel.create({
      name: 'ff-tier-free-stats',
      description: 'Test',
      location: 'Test',
      subscriptionModel: 'free',
      featureFlags: { advancedStatistics: true, liveMatchFollowing: false },
      admin: [],
    });
    await expect(FeatureFlagService.isFeatureEnabled('DETAILED_STATISTICS', club._id.toString())).resolves.toBe(false);
  });
});

describe('Feature flags with missing env vars', () => {
  let snap: Record<string, string | undefined>;

  beforeEach(() => {
    snap = snapshotEnv();
    clearAllFeatureEnvs();
  });

  afterEach(() => { restoreEnv(snap); });

  it('SOCKET disabled when env var missing', () => {
    expect(FeatureFlagService.isEnvFeatureEnabled('SOCKET')).toBe(false);
  });

  it('LEAGUES disabled when env var missing', () => {
    expect(FeatureFlagService.isEnvFeatureEnabled('LEAGUES')).toBe(false);
  });

  it('OAC_CREATION defaults to true when env var missing', () => {
    expect(FeatureFlagService.isEnvFeatureEnabled('OAC_CREATION')).toBe(true);
  });

  it('unknown feature returns false', () => {
    expect(FeatureFlagService.isEnvFeatureEnabled('NONEXISTENT')).toBe(false);
  });
});
