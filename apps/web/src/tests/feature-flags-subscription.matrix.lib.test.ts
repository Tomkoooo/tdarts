/**
 * Contract tests aligned with docs/architect/FEATURE_FLAGS.md and UI expectations.
 * Uses real @tdarts/services SubscriptionService + in-memory Mongo (global Jest setup).
 */
import { ClubModel, TournamentModel } from '@tdarts/core';
import { SubscriptionService } from '@tdarts/services';
import { isSubscriptionPaywallActive } from '@tdarts/core';
import { FeatureFlagService } from '@/features/flags/lib/featureFlags';

const ENV_KEYS = [
  'NEXT_PUBLIC_ENABLE_ALL',
  'NEXT_PUBLIC_ENABLE_SOCKET',
  'NEXT_PUBLIC_ENABLE_LEAGUES',
  'NEXT_PUBLIC_ENABLE_PREMIUM_TOURNAMENTS',
  'NEXT_PUBLIC_ENABLE_LIVE_MATCH_FOLLOWING',
  'NEXT_PUBLIC_ENABLE_DETAILED_STATISTICS',
  'NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED',
] as const;

function snapshotEnv(): Record<string, string | undefined> {
  const s: Record<string, string | undefined> = {};
  for (const k of ENV_KEYS) {
    s[k] = process.env[k];
  }
  return s;
}

function restoreEnv(s: Record<string, string | undefined>) {
  for (const k of ENV_KEYS) {
    const v = s[k];
    if (v === undefined) Reflect.deleteProperty(process.env, k);
    else process.env[k] = v;
  }
}

function tournamentDoc(clubId: unknown, startDate: Date, id: string) {
  return {
    tournamentId: id,
    clubId,
    tournamentPlayers: [],
    groups: [],
    knockout: [],
    boards: [],
    tournamentSettings: {
      status: 'pending',
      name: `T ${id}`,
      startDate,
      maxPlayers: 16,
      format: 'group',
      startingScore: 501,
      tournamentPassword: 'test',
      boardCount: 1,
      entryFee: 0,
      location: 'Test',
      type: 'amateur',
      registrationDeadline: startDate,
    },
    isSandbox: false,
    verified: false,
    isDeleted: false,
  };
}

describe('Paywall switch (single source: @tdarts/core isSubscriptionPaywallActive)', () => {
  let snap: Record<string, string | undefined>;

  beforeEach(() => {
    snap = snapshotEnv();
  });

  afterEach(() => {
    restoreEnv(snap);
  });

  it('active only for exact string "true" (prod must match)', () => {
    process.env.NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED = 'true';
    expect(isSubscriptionPaywallActive()).toBe(true);
  });

  it.each([
    ['false', false],
    ['', false],
    ['True', false],
    ['1', false],
  ])('inactive for %p', (value, expected) => {
    process.env.NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED = value;
    expect(isSubscriptionPaywallActive()).toBe(expected);
  });

  it('inactive when unset', () => {
    Reflect.deleteProperty(process.env, 'NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED');
    expect(isSubscriptionPaywallActive()).toBe(false);
  });
});

describe('SubscriptionService quotas vs FEATURE_FLAGS (paywall off = no monthly cap, like UI)', () => {
  let snap: Record<string, string | undefined>;

  beforeEach(async () => {
    snap = snapshotEnv();
    await ClubModel.deleteMany({ name: /^matrix-quota-/ });
    await TournamentModel.deleteMany({ tournamentId: /^matrix-quota-/ });
  });

  afterEach(async () => {
    await ClubModel.deleteMany({ name: /^matrix-quota-/ });
    await TournamentModel.deleteMany({ tournamentId: /^matrix-quota-/ });
    restoreEnv(snap);
  });

  it('paywall off: free club with 2 real tournaments in month still canCreate (matches disabled paywall UI)', async () => {
    Reflect.deleteProperty(process.env, 'NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED');
    const club = await ClubModel.create({
      name: 'matrix-quota-free',
      description: 'Test',
      location: 'Test',
      subscriptionModel: 'free',
      admin: [],
    });
    const startDate = new Date();
    await TournamentModel.create(tournamentDoc(club._id, startDate, 'matrix-quota-a'));
    await TournamentModel.create(tournamentDoc(club._id, startDate, 'matrix-quota-b'));

    const check = await SubscriptionService.canCreateTournament(
      club._id.toString(),
      startDate,
      false,
      false
    );
    expect(check.canCreate).toBe(true);
    expect(check.maxAllowed).toBe(-1);
  });

  it('paywall on: basic tier blocked when monthly non-sandbox cap reached (subscription UI)', async () => {
    process.env.NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED = 'true';
    const club = await ClubModel.create({
      name: 'matrix-quota-basic-on',
      description: 'Test',
      location: 'Test',
      subscriptionModel: 'basic',
      admin: [],
    });
    const startDate = new Date();
    for (let i = 0; i < 3; i++) {
      await TournamentModel.create(tournamentDoc(club._id, startDate, `matrix-quota-d${i}`));
    }

    const check = await SubscriptionService.canCreateTournament(
      club._id.toString(),
      startDate,
      false,
      false
    );
    expect(check.canCreate).toBe(false);
    expect(check.currentCount).toBe(3);
    expect(check.maxAllowed).toBe(3);
  });
});

describe('FeatureFlagService matrix (docs/architect/FEATURE_FLAGS.md)', () => {
  let snap: Record<string, string | undefined>;
  let clubPaywallOnId: string;
  let clubPaywallOffId: string;

  beforeEach(async () => {
    snap = snapshotEnv();
    process.env.NEXT_PUBLIC_ENABLE_ALL = 'false';

    await ClubModel.deleteMany({ name: /^matrix-flag-/ });

    const on = await ClubModel.create({
      name: 'matrix-flag-on',
      description: 'Test',
      location: 'Test',
      subscriptionModel: 'pro',
      featureFlags: {
        liveMatchFollowing: true,
        advancedStatistics: true,
        premiumTournaments: true,
      },
      admin: [],
    });
    clubPaywallOnId = on._id.toString();

    const off = await ClubModel.create({
      name: 'matrix-flag-off',
      description: 'Test',
      location: 'Test',
      subscriptionModel: 'free',
      featureFlags: {
        liveMatchFollowing: false,
        advancedStatistics: true,
        premiumTournaments: true,
      },
      admin: [],
    });
    clubPaywallOffId = off._id.toString();
  });

  afterEach(async () => {
    await ClubModel.deleteMany({ name: /^matrix-flag-/ });
    restoreEnv(snap);
  });

  it('paywall off + ENABLE_SOCKET: socket on for club without liveMatchFollowing (live page / UI)', async () => {
    Reflect.deleteProperty(process.env, 'NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED');
    process.env.NEXT_PUBLIC_ENABLE_SOCKET = 'true';
    await expect(FeatureFlagService.isSocketEnabled(clubPaywallOffId)).resolves.toBe(true);
  });

  it('paywall on + ENABLE_SOCKET: socket requires liveMatchFollowing on club', async () => {
    process.env.NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED = 'true';
    process.env.NEXT_PUBLIC_ENABLE_SOCKET = 'true';
    await expect(FeatureFlagService.isSocketEnabled(clubPaywallOnId)).resolves.toBe(true);

    const noLive = await ClubModel.create({
      name: 'matrix-flag-no-live',
      description: 'Test',
      location: 'Test',
      subscriptionModel: 'pro',
      featureFlags: {
        liveMatchFollowing: false,
        advancedStatistics: true,
        premiumTournaments: true,
      },
      admin: [],
    });
    await expect(FeatureFlagService.isSocketEnabled(noLive._id.toString())).resolves.toBe(false);
  });

  it('paywall off + LEAGUES env: isFeatureEnabled true without paid tier', async () => {
    Reflect.deleteProperty(process.env, 'NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED');
    process.env.NEXT_PUBLIC_ENABLE_LEAGUES = 'true';
    await expect(FeatureFlagService.isFeatureEnabled('LEAGUES', clubPaywallOffId)).resolves.toBe(true);
  });

  it('paywall on + LEAGUES env: free club denied', async () => {
    process.env.NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED = 'true';
    process.env.NEXT_PUBLIC_ENABLE_LEAGUES = 'true';
    await expect(FeatureFlagService.isFeatureEnabled('LEAGUES', clubPaywallOffId)).resolves.toBe(false);
    await expect(FeatureFlagService.isFeatureEnabled('LEAGUES', clubPaywallOnId)).resolves.toBe(true);
  });

  it('paywall off + PREMIUM_TOURNAMENTS: requires club premiumTournaments flag', async () => {
    Reflect.deleteProperty(process.env, 'NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED');
    process.env.NEXT_PUBLIC_ENABLE_PREMIUM_TOURNAMENTS = 'true';
    await expect(FeatureFlagService.isFeatureEnabled('PREMIUM_TOURNAMENTS', clubPaywallOffId)).resolves.toBe(true);

    const noPremium = await ClubModel.create({
      name: 'matrix-flag-no-premium',
      description: 'Test',
      location: 'Test',
      subscriptionModel: 'free',
      featureFlags: {
        liveMatchFollowing: false,
        advancedStatistics: false,
        premiumTournaments: false,
      },
      admin: [],
    });
    await expect(FeatureFlagService.isFeatureEnabled('PREMIUM_TOURNAMENTS', noPremium._id.toString())).resolves.toBe(
      false
    );
  });
});
