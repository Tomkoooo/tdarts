import { FeatureFlagService } from '@/features/flags/lib/featureFlags';
import { assertEligibility, assertEligibilityResult } from '@/features/flags/lib/eligibility';
import {
  __setSystemSettingsCacheForTests,
  bustSystemSettingsCache,
  SYSTEM_SETTINGS_DEFAULTS,
  type SystemSettingsSnapshot,
} from '@tdarts/core/system-settings';

jest.mock('@/features/flags/lib/featureFlags', () => ({
  FeatureFlagService: {
    isFeatureEnabled: jest.fn(),
  },
}));

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

describe('feature eligibility paid override (DB-backed paywall)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    bustSystemSettingsCache();
  });

  afterAll(() => {
    bustSystemSettingsCache();
  });

  it('allows access when paywall is off (paid override)', async () => {
    setSettings({ subscriptionPaywallEnabled: false });

    const result = await assertEligibilityResult({
      featureName: 'LEAGUES',
      clubId: 'club-1',
      allowPaidOverride: true,
    });

    expect(result).toEqual({
      ok: true,
      data: {
        allowed: true,
        paidOverride: true,
        reason: 'paid_override',
      },
    });
    expect(FeatureFlagService.isFeatureEnabled).not.toHaveBeenCalled();
  });

  it('returns structured denial when feature is disabled and paywall is on', async () => {
    setSettings({ subscriptionPaywallEnabled: true });
    (FeatureFlagService.isFeatureEnabled as jest.Mock).mockResolvedValue(false);

    const result = await assertEligibilityResult({
      featureName: 'LEAGUES',
      clubId: 'club-1',
      allowPaidOverride: true,
    });

    expect(result).toEqual({
      ok: false,
      code: 'FEATURE_DISABLED',
      status: 403,
      message: 'Feature disabled: LEAGUES',
    });
  });

  it('returns not_checked when feature name is omitted (and override forced off)', async () => {
    setSettings({ subscriptionPaywallEnabled: true });
    const result = await assertEligibilityResult({ allowPaidOverride: false });
    expect(result).toEqual({
      ok: true,
      data: { allowed: true, paidOverride: false, reason: 'not_checked' },
    });
  });

  it('throws from strict assertEligibility wrapper on feature denial', async () => {
    setSettings({ subscriptionPaywallEnabled: true });
    (FeatureFlagService.isFeatureEnabled as jest.Mock).mockResolvedValue(false);
    await expect(assertEligibility({ featureName: 'LEAGUES', clubId: 'club-1' })).rejects.toThrow(
      'Feature disabled: LEAGUES'
    );
  });

  it('feature_enabled when paywall on and feature toggle on', async () => {
    setSettings({ subscriptionPaywallEnabled: true });
    (FeatureFlagService.isFeatureEnabled as jest.Mock).mockResolvedValue(true);
    const result = await assertEligibilityResult({
      featureName: 'LEAGUES',
      clubId: 'club-1',
      allowPaidOverride: true,
    });
    expect(result).toEqual({
      ok: true,
      data: { allowed: true, paidOverride: false, reason: 'feature_enabled' },
    });
  });
});
