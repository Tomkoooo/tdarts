import { FeatureFlagService } from '@/features/flags/lib/featureFlags';

jest.mock('@/database/models/club.model', () => ({
  ClubModel: {
    findById: jest.fn(),
  },
}));

import { ClubModel } from '@/database/models/club.model';

describe('FeatureFlagService (paywall + socket)', () => {
  const clubId = '507f1f77bcf86cd799439011';
  const envKeys = [
    'NEXT_PUBLIC_ENABLE_ALL',
    'NEXT_PUBLIC_ENABLE_SOCKET',
    'NEXT_PUBLIC_ENABLE_LEAGUES',
    'NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED',
  ] as const;
  const envSnapshot: Partial<Record<(typeof envKeys)[number], string | undefined>> = {};

  beforeAll(() => {
    for (const k of envKeys) {
      envSnapshot[k] = process.env[k];
    }
  });

  afterAll(() => {
    for (const k of envKeys) {
      const v = envSnapshot[k];
      if (v === undefined) {
        Reflect.deleteProperty(process.env, k);
      } else {
        process.env[k] = v;
      }
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_ENABLE_ALL = 'false';
    Reflect.deleteProperty(process.env, 'NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED');
    Reflect.deleteProperty(process.env, 'NEXT_PUBLIC_ENABLE_SOCKET');
    Reflect.deleteProperty(process.env, 'NEXT_PUBLIC_ENABLE_LEAGUES');
  });

  function mockClub(doc: object | null) {
    (ClubModel.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue(doc),
    });
  }

  it('isSocketEnabled is false when NEXT_PUBLIC_ENABLE_SOCKET is not true', async () => {
    process.env.NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED = 'true';
    await expect(FeatureFlagService.isSocketEnabled(clubId)).resolves.toBe(false);
  });

  it('when paywall inactive, socket is on if env is on (ignores club liveMatchFollowing)', async () => {
    process.env.NEXT_PUBLIC_ENABLE_SOCKET = 'true';
    mockClub({ featureFlags: { liveMatchFollowing: false }, subscriptionModel: 'free' });
    await expect(FeatureFlagService.isSocketEnabled(clubId)).resolves.toBe(true);
  });

  it('when paywall inactive, socket still off if club is missing', async () => {
    process.env.NEXT_PUBLIC_ENABLE_SOCKET = 'true';
    mockClub(null);
    await expect(FeatureFlagService.isSocketEnabled(clubId)).resolves.toBe(false);
  });

  it('when paywall active, socket uses liveMatchFollowing (not enterprise-only)', async () => {
    process.env.NEXT_PUBLIC_ENABLE_SOCKET = 'true';
    process.env.NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED = 'true';
    mockClub({ featureFlags: { liveMatchFollowing: true }, subscriptionModel: 'basic' });
    await expect(FeatureFlagService.isSocketEnabled(clubId)).resolves.toBe(true);
  });

  it('when paywall active, socket off if liveMatchFollowing is false', async () => {
    process.env.NEXT_PUBLIC_ENABLE_SOCKET = 'true';
    process.env.NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED = 'true';
    mockClub({ featureFlags: { liveMatchFollowing: false }, subscriptionModel: 'pro' });
    await expect(FeatureFlagService.isSocketEnabled(clubId)).resolves.toBe(false);
  });

  it('when paywall inactive, isFeatureEnabled still respects disabled LEAGUES env', async () => {
    process.env.NEXT_PUBLIC_ENABLE_LEAGUES = 'false';
    await expect(FeatureFlagService.isFeatureEnabled('LEAGUES', clubId)).resolves.toBe(false);
    expect(ClubModel.findById).not.toHaveBeenCalled();
  });
});
