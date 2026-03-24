jest.mock('@/features/flags/lib/featureAccess', () => ({
  evaluateFeatureAccess: jest.fn(),
  PAYWALLED_FEATURES: new Set(['LEAGUES', 'SOCKET']),
}));

jest.mock('@/features/flags/lib/featureFlags', () => ({
  FeatureFlagService: {
    isFeatureEnabled: jest.fn(),
    isSocketEnabled: jest.fn(),
  },
}));

import { checkFeatureFlagAction, checkSocketFlagAction } from '@/features/feature-flags/actions/checkFeatureFlags.action';
import { evaluateFeatureAccess } from '@/features/flags/lib/featureAccess';
import { FeatureFlagService } from '@/features/flags/lib/featureFlags';

describe('feature flags actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  it('returns feature and socket checks when allowed', async () => {
    (evaluateFeatureAccess as jest.Mock).mockResolvedValue({
      ok: true,
      data: { userId: 'u1', featureKey: 'LEAGUES', bypassReason: 'none' },
    });
    (FeatureFlagService.isFeatureEnabled as jest.Mock).mockResolvedValue(true);
    (FeatureFlagService.isSocketEnabled as jest.Mock).mockResolvedValue(false);

    await expect(checkFeatureFlagAction({ feature: 'LEAGUES', clubId: 'club-1' })).resolves.toEqual(
      expect.objectContaining({ enabled: true })
    );
    await expect(checkSocketFlagAction({ clubId: 'club-1' })).resolves.toEqual({ enabled: false });
  });
});
