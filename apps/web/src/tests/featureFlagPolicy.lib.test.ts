import { FeatureFlagService } from '@/features/flags/lib/featureFlags';
import { isFeatureAllowed, isSocketAllowed } from '@/features/feature-flags/lib/featureFlagPolicy';

jest.mock('@/features/flags/lib/featureFlags', () => ({
  FeatureFlagService: {
    isFeatureEnabled: jest.fn(),
    isSocketEnabled: jest.fn(),
  },
}));

describe('featureFlagPolicy lib', () => {
  it('delegates feature checks', async () => {
    (FeatureFlagService.isFeatureEnabled as jest.Mock).mockResolvedValue(true);
    const result = await isFeatureAllowed('leagues', 'club-1');
    expect(FeatureFlagService.isFeatureEnabled).toHaveBeenCalledWith('leagues', 'club-1');
    expect(result).toBe(true);
  });

  it('delegates socket checks', async () => {
    (FeatureFlagService.isSocketEnabled as jest.Mock).mockResolvedValue(false);
    const result = await isSocketAllowed('club-2');
    expect(FeatureFlagService.isSocketEnabled).toHaveBeenCalledWith('club-2');
    expect(result).toBe(false);
  });
});
