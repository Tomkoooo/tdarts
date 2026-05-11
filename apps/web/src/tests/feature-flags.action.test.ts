import {
  __setSystemSettingsCacheForTests,
  bustSystemSettingsCache,
  SYSTEM_SETTINGS_DEFAULTS,
  type SystemSettingsSnapshot,
} from '@tdarts/core/system-settings';

jest.mock('@/features/flags/lib/featureAccess', () => ({
  evaluateFeatureAccess: jest.fn(),
  PAYWALLED_FEATURES: new Set(['LEAGUES', 'SOCKET']),
}));

import { checkFeatureFlagAction, checkSocketFlagAction } from '@/features/feature-flags/actions/checkFeatureFlags.action';
import { evaluateFeatureAccess } from '@/features/flags/lib/featureAccess';

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

describe('feature flags actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    bustSystemSettingsCache();
    setSettings({ subscriptionPaywallEnabled: true });
  });

  afterEach(() => {
    bustSystemSettingsCache();
  });

  it('returns auth denial shape', async () => {
    (evaluateFeatureAccess as jest.Mock).mockResolvedValue({
      ok: false,
      code: 'LOGIN_REQUIRED',
      status: 401,
      message: 'Unauthorized',
    });
    const result = await checkFeatureFlagAction({ feature: 'LEAGUES', clubId: 'club-1' });
    expect(result).toMatchObject({ ok: false, status: 401 });
  });

  it('propagates SUBSCRIPTION_REQUIRED denial from evaluateFeatureAccess', async () => {
    (evaluateFeatureAccess as jest.Mock).mockResolvedValue({
      ok: false,
      code: 'SUBSCRIPTION_REQUIRED',
      status: 403,
      message: 'tier lacks feature',
    });
    const result = await checkFeatureFlagAction({ feature: 'LEAGUES', clubId: 'club-1' });
    expect(result).toMatchObject({ ok: false, code: 'SUBSCRIPTION_REQUIRED' });
  });

  it('propagates CLUB_NOT_ELIGIBLE denial from evaluateFeatureAccess', async () => {
    (evaluateFeatureAccess as jest.Mock).mockResolvedValue({
      ok: false,
      code: 'CLUB_NOT_ELIGIBLE',
      status: 403,
      message: 'club flag off',
    });
    const result = await checkFeatureFlagAction({ feature: 'DETAILED_STATISTICS', clubId: 'club-1' });
    expect(result).toMatchObject({ ok: false, code: 'CLUB_NOT_ELIGIBLE' });
  });

  it('returns enabled=true when evaluateFeatureAccess allows access', async () => {
    (evaluateFeatureAccess as jest.Mock).mockResolvedValue({
      ok: true,
      data: { userId: 'u1', featureKey: 'LEAGUES', bypassReason: 'none' },
    });
    setSettings({ subscriptionPaywallEnabled: true });

    const result = await checkFeatureFlagAction({ feature: 'LEAGUES', clubId: 'club-1' });
    expect(result).toEqual(
      expect.objectContaining({ enabled: true, subscriptionModelEnabled: true })
    );
  });

  it('socket action returns enabled=true on allow', async () => {
    (evaluateFeatureAccess as jest.Mock).mockResolvedValue({
      ok: true,
      data: { userId: 'u1', featureKey: 'SOCKET', bypassReason: 'none' },
    });
    await expect(checkSocketFlagAction({ clubId: 'club-1' })).resolves.toEqual(
      expect.objectContaining({ enabled: true })
    );
  });

  it('subscriptionModelEnabled mirrors SystemSettings.subscriptionPaywallEnabled (false case)', async () => {
    (evaluateFeatureAccess as jest.Mock).mockResolvedValue({
      ok: true,
      data: { userId: 'u1', featureKey: 'LEAGUES', bypassReason: 'paywall_disabled' },
    });
    setSettings({ subscriptionPaywallEnabled: false });

    const result = await checkFeatureFlagAction({ feature: 'LEAGUES', clubId: 'club-1' });
    expect(result).toEqual(expect.objectContaining({ subscriptionModelEnabled: false }));
  });
});
