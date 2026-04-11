jest.mock('@/shared/lib/withTelemetry', () => ({
  withTelemetry: jest.fn((_name, handler) => (input: unknown) => handler(input)),
}));

jest.mock('@/lib/mongoose', () => ({
  connectMongo: jest.fn(),
}));

jest.mock('@tdarts/core', () => ({
  ...jest.requireActual('@tdarts/core'),
  ClubModel: {
    findById: jest.fn(),
  },
}));

jest.mock('@/features/flags/lib/featureFlags', () => ({
  FeatureFlagService: {
    isFeatureEnabled: jest.fn(),
  },
}));

jest.mock('@/features/auth/lib/authorizeUser', () => ({
  authorizeUserResult: jest.fn(),
}));

jest.mock('@tdarts/services', () => ({
  ...jest.requireActual('@tdarts/services'),
  AuthorizationService: {
    isGlobalAdmin: jest.fn(),
  },
}));

import { getPublicClubLeagueManagementMetaAction } from '@/features/clubs/actions/getPublicClubLeagueManagementMeta.action';
import { ClubModel } from '@tdarts/core';
import { FeatureFlagService } from '@/features/flags/lib/featureFlags';
import { authorizeUserResult } from '@/features/auth/lib/authorizeUser';
import { AuthorizationService } from '@tdarts/services';

describe('getPublicClubLeagueManagementMetaAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('keeps league management enabled for global admin even when club is free-tier', async () => {
    (ClubModel.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({ subscriptionModel: 'free' }),
      }),
    });
    (FeatureFlagService.isFeatureEnabled as jest.Mock).mockResolvedValue(false);
    (authorizeUserResult as jest.Mock).mockResolvedValue({ ok: true, data: { userId: 'admin-1' } });
    (AuthorizationService.isGlobalAdmin as jest.Mock).mockResolvedValue(true);

    const result = await getPublicClubLeagueManagementMetaAction({ clubId: 'club-1' });

    expect(result).toEqual({
      subscriptionModel: 'free',
      managementEnabled: true,
      isGlobalAdmin: true,
    });
  });
});
