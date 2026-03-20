jest.mock('@/features/auth/lib/authorizeUser', () => ({
  authorizeUserResult: jest.fn(),
}));

jest.mock('@/features/flags/lib/eligibility', () => ({
  assertEligibilityResult: jest.fn(),
}));

jest.mock('@/features/flags/lib/featureFlags', () => ({
  FeatureFlagService: {
    isFeatureEnabled: jest.fn(),
    isSocketEnabled: jest.fn(),
  },
}));

import { checkFeatureFlagAction, checkSocketFlagAction } from '@/features/feature-flags/actions/checkFeatureFlags.action';
import { authorizeUserResult } from '@/features/auth/lib/authorizeUser';
import { assertEligibilityResult } from '@/features/flags/lib/eligibility';
import { FeatureFlagService } from '@/features/flags/lib/featureFlags';

describe('feature flags actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns auth denial shape', async () => {
    (authorizeUserResult as jest.Mock).mockResolvedValue({
      ok: false,
      code: 'UNAUTHORIZED',
      status: 401,
      message: 'Unauthorized',
    });
    const result = await checkFeatureFlagAction({ feature: 'leagues', clubId: 'club-1' });
    expect(result).toMatchObject({ ok: false, status: 401 });
  });

  it('returns feature and socket checks when allowed', async () => {
    (authorizeUserResult as jest.Mock).mockResolvedValue({ ok: true, data: { userId: 'u1' } });
    (assertEligibilityResult as jest.Mock).mockResolvedValue({
      ok: true,
      data: { allowed: true, paidOverride: false, reason: 'feature_enabled' },
    });
    (FeatureFlagService.isFeatureEnabled as jest.Mock).mockResolvedValue(true);
    (FeatureFlagService.isSocketEnabled as jest.Mock).mockResolvedValue(false);

    await expect(checkFeatureFlagAction({ feature: 'leagues', clubId: 'club-1' })).resolves.toEqual(
      expect.objectContaining({ enabled: true })
    );
    await expect(checkSocketFlagAction({ clubId: 'club-1' })).resolves.toEqual({ enabled: false });
  });
});
