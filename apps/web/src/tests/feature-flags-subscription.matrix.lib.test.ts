/**
 * Feature flag tests aligned with the DB-backed SystemSettings model.
 * No reliance on env vars; per-test we mutate the in-process settings cache.
 */
import { ClubModel } from '@tdarts/core';
import { FeatureFlagService } from '@/features/flags/lib/featureFlags';
import {
  __setSystemSettingsCacheForTests,
  bustSystemSettingsCache,
  isSubscriptionPaywallEnabled,
  SYSTEM_SETTINGS_DEFAULTS,
  type SystemSettingsSnapshot,
} from '@tdarts/core/system-settings';
import { FEATURE_REGISTRY } from '@/features/flags/lib/featureRegistry';
import { FEATURE_KEYS } from '@/features/flags/lib/featureKeys';

function setSettings(overrides: Partial<SystemSettingsSnapshot> = {}) {
  const snapshot: SystemSettingsSnapshot = {
    features: { ...SYSTEM_SETTINGS_DEFAULTS.features, ...(overrides.features ?? {}) },
    subscriptionPaywallEnabled:
      overrides.subscriptionPaywallEnabled ?? SYSTEM_SETTINGS_DEFAULTS.subscriptionPaywallEnabled,
    superAdminBypassEnabled:
      overrides.superAdminBypassEnabled ?? SYSTEM_SETTINGS_DEFAULTS.superAdminBypassEnabled,
    updatedAt: overrides.updatedAt ?? new Date(),
    updatedBy: overrides.updatedBy ?? null,
  };
  __setSystemSettingsCacheForTests(snapshot);
  return snapshot;
}

afterEach(() => {
  bustSystemSettingsCache();
});

describe('isSubscriptionPaywallEnabled', () => {
  it('reflects SystemSettings.subscriptionPaywallEnabled = true', async () => {
    setSettings({ subscriptionPaywallEnabled: true });
    await expect(isSubscriptionPaywallEnabled()).resolves.toBe(true);
  });

  it('reflects SystemSettings.subscriptionPaywallEnabled = false', async () => {
    setSettings({ subscriptionPaywallEnabled: false });
    await expect(isSubscriptionPaywallEnabled()).resolves.toBe(false);
  });
});

describe('Feature registry completeness', () => {
  it('every FEATURE_KEY has a registry entry', () => {
    for (const key of Object.values(FEATURE_KEYS)) {
      expect(FEATURE_REGISTRY[key]).toBeDefined();
    }
  });

  it('every registry entry has tier metadata fields (envVar removed)', () => {
    for (const def of Object.values(FEATURE_REGISTRY)) {
      expect(def).toHaveProperty('tierEntitlement');
      expect(def).toHaveProperty('paywallOffBehavior');
      expect(def).toHaveProperty('requiresSubscription');
      expect((def as any).envVar).toBeUndefined();
    }
  });

  it('PREMIUM_TOURNAMENTS does not exist in registry or keys', () => {
    expect((FEATURE_KEYS as Record<string, string>)['PREMIUM_TOURNAMENTS']).toBeUndefined();
    expect(FEATURE_REGISTRY['PREMIUM_TOURNAMENTS' as keyof typeof FEATURE_REGISTRY]).toBeUndefined();
  });
});

describe('Production parity (paywall off, all features on)', () => {
  beforeEach(async () => {
    setSettings({
      subscriptionPaywallEnabled: false,
      features: {
        LEAGUES: true,
        SOCKET: true,
        LIVE_MATCH_FOLLOWING: true,
        DETAILED_STATISTICS: true,
        ADVANCED_STATISTICS: true,
        OAC_CREATION: true,
      },
    });
    await ClubModel.deleteMany({ name: /^ff-prod-/ });
  });

  afterEach(async () => {
    await ClubModel.deleteMany({ name: /^ff-prod-/ });
  });

  it('SOCKET enabled at the global level', async () => {
    await expect(FeatureFlagService.isGlobalFeatureEnabled('SOCKET')).resolves.toBe(true);
  });

  it('LEAGUES enabled at the global level', async () => {
    await expect(FeatureFlagService.isGlobalFeatureEnabled('LEAGUES')).resolves.toBe(true);
  });

  it('socket enabled for any club regardless of liveMatchFollowing flag', async () => {
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

  it('leagues enabled for free club (paywall_off + paywallOffBehavior=allow)', async () => {
    const club = await ClubModel.create({
      name: 'ff-prod-leagues',
      description: 'Test',
      location: 'Test',
      subscriptionModel: 'free',
      admin: [],
    });
    await expect(FeatureFlagService.isFeatureEnabled('LEAGUES', club._id.toString())).resolves.toBe(true);
  });

  it('regression: LEAGUES global=true + paywall=false yields enabled=true on the server (the original prod symptom)', async () => {
    const club = await ClubModel.create({
      name: 'ff-prod-leagues-regression',
      description: 'Test',
      location: 'Test',
      subscriptionModel: 'free',
      admin: [],
    });
    await expect(FeatureFlagService.isFeatureEnabled('LEAGUES', club._id.toString())).resolves.toBe(true);
    const outcome = await FeatureFlagService.evaluateClubFeature(
      club._id.toString(),
      'LEAGUES'
    );
    expect(outcome).toEqual({ kind: 'allowed' });
  });
});

describe('Paywall ON: tier-based entitlements', () => {
  beforeEach(async () => {
    setSettings({
      subscriptionPaywallEnabled: true,
      features: {
        LEAGUES: true,
        SOCKET: true,
        LIVE_MATCH_FOLLOWING: true,
        DETAILED_STATISTICS: true,
        ADVANCED_STATISTICS: true,
        OAC_CREATION: true,
      },
    });
    await ClubModel.deleteMany({ name: /^ff-tier-/ });
  });

  afterEach(async () => {
    await ClubModel.deleteMany({ name: /^ff-tier-/ });
  });

  it('free club cannot access leagues (subscription_required)', async () => {
    const club = await ClubModel.create({
      name: 'ff-tier-free-leagues',
      description: 'Test',
      location: 'Test',
      subscriptionModel: 'free',
      admin: [],
    });
    await expect(FeatureFlagService.isFeatureEnabled('LEAGUES', club._id.toString())).resolves.toBe(false);
    const outcome = await FeatureFlagService.evaluateClubFeature(club._id.toString(), 'LEAGUES');
    expect(outcome.kind).toBe('subscription_required');
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
    await expect(
      FeatureFlagService.isFeatureEnabled('DETAILED_STATISTICS', club._id.toString())
    ).resolves.toBe(true);
  });

  it('pro club without advancedStatistics flag yields club_not_eligible', async () => {
    const club = await ClubModel.create({
      name: 'ff-tier-pro-stats-no',
      description: 'Test',
      location: 'Test',
      subscriptionModel: 'pro',
      featureFlags: { advancedStatistics: false, liveMatchFollowing: false },
      admin: [],
    });
    const outcome = await FeatureFlagService.evaluateClubFeature(
      club._id.toString(),
      'DETAILED_STATISTICS'
    );
    expect(outcome).toMatchObject({ kind: 'club_not_eligible' });
  });

  it('free club without tier entitlement yields subscription_required', async () => {
    const club = await ClubModel.create({
      name: 'ff-tier-free-stats',
      description: 'Test',
      location: 'Test',
      subscriptionModel: 'free',
      featureFlags: { advancedStatistics: true, liveMatchFollowing: false },
      admin: [],
    });
    const outcome = await FeatureFlagService.evaluateClubFeature(
      club._id.toString(),
      'DETAILED_STATISTICS'
    );
    expect(outcome.kind).toBe('subscription_required');
  });
});

describe('Global toggles off', () => {
  it('SOCKET disabled when feature toggle is off', async () => {
    setSettings({ features: { ...SYSTEM_SETTINGS_DEFAULTS.features, SOCKET: false } });
    await expect(FeatureFlagService.isGlobalFeatureEnabled('SOCKET')).resolves.toBe(false);
  });

  it('LEAGUES disabled when feature toggle is off', async () => {
    setSettings({ features: { ...SYSTEM_SETTINGS_DEFAULTS.features, LEAGUES: false } });
    await expect(FeatureFlagService.isGlobalFeatureEnabled('LEAGUES')).resolves.toBe(false);
  });

  it('unknown feature returns false', async () => {
    setSettings();
    await expect(FeatureFlagService.isGlobalFeatureEnabled('NONEXISTENT')).resolves.toBe(false);
  });
});
