import { FeatureFlagService } from '@/features/flags/lib/featureFlags';
import {
  __setSystemSettingsCacheForTests,
  bustSystemSettingsCache,
  SYSTEM_SETTINGS_DEFAULTS,
  type SystemSettingsSnapshot,
} from '@tdarts/core/system-settings';

jest.mock('@/database/models/club.model', () => ({
  ClubModel: {
    findById: jest.fn(),
  },
}));

import { ClubModel } from '@/database/models/club.model';

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

function mockClub(doc: object | null) {
  (ClubModel.findById as jest.Mock).mockReturnValue({
    select: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue(doc),
    }),
  });
}

describe('FeatureFlagService (paywall + socket) — DB-backed', () => {
  const clubId = '507f1f77bcf86cd799439011';
  const allFeaturesOff = {
    LEAGUES: false,
    SOCKET: false,
    LIVE_MATCH_FOLLOWING: false,
    DETAILED_STATISTICS: false,
    ADVANCED_STATISTICS: false,
    OAC_CREATION: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    bustSystemSettingsCache();
  });

  it('isSocketEnabled is false when global SOCKET toggle is off', async () => {
    setSettings({ features: { ...allFeaturesOff }, subscriptionPaywallEnabled: true });
    await expect(FeatureFlagService.isSocketEnabled(clubId)).resolves.toBe(false);
    expect(ClubModel.findById).not.toHaveBeenCalled();
  });

  it('paywall off + SOCKET on: socket is enabled regardless of liveMatchFollowing', async () => {
    setSettings({
      features: { ...SYSTEM_SETTINGS_DEFAULTS.features, SOCKET: true },
      subscriptionPaywallEnabled: false,
    });
    mockClub({ featureFlags: { liveMatchFollowing: false }, subscriptionModel: 'free' });
    await expect(FeatureFlagService.isSocketEnabled(clubId)).resolves.toBe(true);
  });

  it('paywall off + SOCKET on: socket still disabled if club is missing', async () => {
    setSettings({ subscriptionPaywallEnabled: false });
    mockClub(null);
    await expect(FeatureFlagService.isSocketEnabled(clubId)).resolves.toBe(false);
  });

  it('paywall on: enterprise tier with liveTracking can access socket', async () => {
    setSettings({ subscriptionPaywallEnabled: true });
    mockClub({ featureFlags: { liveMatchFollowing: true }, subscriptionModel: 'enterprise' });
    await expect(FeatureFlagService.isSocketEnabled(clubId)).resolves.toBe(true);
  });

  it('paywall on: basic tier returns subscription_required (liveTracking not in tier)', async () => {
    setSettings({ subscriptionPaywallEnabled: true });
    mockClub({ featureFlags: { liveMatchFollowing: true }, subscriptionModel: 'basic' });
    const outcome = await FeatureFlagService.evaluateClubFeature(clubId, 'SOCKET');
    expect(outcome.kind).toBe('subscription_required');
  });

  it('paywall on + LEAGUES off globally: short-circuits before club lookup', async () => {
    setSettings({
      features: { ...SYSTEM_SETTINGS_DEFAULTS.features, LEAGUES: false },
      subscriptionPaywallEnabled: true,
    });
    await expect(FeatureFlagService.isFeatureEnabled('LEAGUES', clubId)).resolves.toBe(false);
    expect(ClubModel.findById).not.toHaveBeenCalled();
  });
});

describe('SystemSettings cache', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    bustSystemSettingsCache();
  });

  it('respects cache busting after settings updates', async () => {
    setSettings({ features: { ...SYSTEM_SETTINGS_DEFAULTS.features, LEAGUES: true } });
    await expect(FeatureFlagService.isGlobalFeatureEnabled('LEAGUES')).resolves.toBe(true);

    setSettings({ features: { ...SYSTEM_SETTINGS_DEFAULTS.features, LEAGUES: false } });
    await expect(FeatureFlagService.isGlobalFeatureEnabled('LEAGUES')).resolves.toBe(false);
  });
});
