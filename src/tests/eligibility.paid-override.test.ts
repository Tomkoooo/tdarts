import { FeatureFlagService } from '@/features/flags/lib/featureFlags';
import { assertEligibility, assertEligibilityResult } from '@/features/flags/lib/eligibility';

jest.mock('@/features/flags/lib/featureFlags', () => ({
  FeatureFlagService: {
    isFeatureEnabled: jest.fn(),
  },
}));

describe('feature eligibility paid override', () => {
  const originalSubscription = process.env.NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED;
  const originalEnableAll = process.env.NEXT_PUBLIC_ENABLE_ALL;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED = originalSubscription;
    process.env.NEXT_PUBLIC_ENABLE_ALL = originalEnableAll;
  });

  afterAll(() => {
    process.env.NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED = originalSubscription;
    process.env.NEXT_PUBLIC_ENABLE_ALL = originalEnableAll;
  });

  it('allows access when paid override is enabled', async () => {
    process.env.NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED = 'false';

    const result = await assertEligibilityResult({
      featureName: 'PREMIUM_TOURNAMENTS',
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

  it('returns structured denial when feature is disabled and override is off', async () => {
    process.env.NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED = 'true';
    process.env.NEXT_PUBLIC_ENABLE_ALL = 'false';
    (FeatureFlagService.isFeatureEnabled as jest.Mock).mockResolvedValue(false);

    const result = await assertEligibilityResult({
      featureName: 'PREMIUM_TOURNAMENTS',
      clubId: 'club-1',
      allowPaidOverride: true,
    });

    expect(result).toEqual({
      ok: false,
      code: 'FEATURE_DISABLED',
      status: 403,
      message: 'Feature disabled: PREMIUM_TOURNAMENTS',
    });
  });

  it('returns not_checked when feature name is omitted', async () => {
    process.env.NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED = 'true';
    const result = await assertEligibilityResult({ allowPaidOverride: false });
    expect(result).toEqual({
      ok: true,
      data: { allowed: true, paidOverride: false, reason: 'not_checked' },
    });
  });

  it('throws from strict assertEligibility wrapper on feature denial', async () => {
    process.env.NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED = 'true';
    process.env.NEXT_PUBLIC_ENABLE_ALL = 'false';
    (FeatureFlagService.isFeatureEnabled as jest.Mock).mockResolvedValue(false);
    await expect(assertEligibility({ featureName: 'PREMIUM_TOURNAMENTS', clubId: 'club-1' })).rejects.toThrow(
      'Feature disabled: PREMIUM_TOURNAMENTS'
    );
  });
});
