import { ClubModel, TournamentModel } from '@tdarts/core';
import { SubscriptionService } from '@tdarts/services';
import { TIER_CONFIG, getTierConfig } from '@tdarts/core/subscription-tiers';
import type { TierId } from '@tdarts/core/subscription-tiers';
import { findExistingVerifiedTournamentForWeek } from '@/features/tournaments/lib/tournamentCreation.db';

const ENV_KEYS = [
  'NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED',
] as const;

function snapshotEnv() {
  const s: Record<string, string | undefined> = {};
  for (const k of ENV_KEYS) s[k] = process.env[k];
  return s;
}

function restoreEnv(s: Record<string, string | undefined>) {
  for (const k of ENV_KEYS) {
    if (s[k] === undefined) Reflect.deleteProperty(process.env, k);
    else process.env[k] = s[k];
  }
}

function tournamentDoc(clubId: unknown, startDate: Date, id: string, overrides: Record<string, unknown> = {}) {
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
    ...overrides,
  };
}

async function createClub(name: string, tier: TierId, verified = false) {
  return ClubModel.create({
    name,
    description: 'Test',
    location: 'Test',
    subscriptionModel: tier,
    admin: [],
    verified,
  });
}

describe('TIER_CONFIG integrity', () => {
  it('has correct limits for free tier', () => {
    const t = TIER_CONFIG.free;
    expect(t.limits.monthlyLiveTournaments).toBe(0);
    expect(t.limits.monthlySandboxTournaments).toBe(5);
    expect(t.limits.allowNonSandbox).toBe(false);
    expect(t.features.leagues).toBe(false);
    expect(t.features.liveTracking).toBe(false);
    expect(t.features.detailedStatistics).toBe(false);
  });

  it('has correct limits for basic tier', () => {
    const t = TIER_CONFIG.basic;
    expect(t.limits.monthlyLiveTournaments).toBe(2);
    expect(t.limits.monthlySandboxTournaments).toBe(-1);
    expect(t.limits.allowNonSandbox).toBe(true);
    expect(t.features.leagues).toBe(true);
    expect(t.features.liveTracking).toBe(false);
    expect(t.features.detailedStatistics).toBe(false);
  });

  it('has correct limits for pro tier', () => {
    const t = TIER_CONFIG.pro;
    expect(t.limits.monthlyLiveTournaments).toBe(4);
    expect(t.limits.monthlySandboxTournaments).toBe(-1);
    expect(t.limits.allowNonSandbox).toBe(true);
    expect(t.features.leagues).toBe(true);
    expect(t.features.liveTracking).toBe(false);
    expect(t.features.detailedStatistics).toBe(true);
  });

  it('has correct limits for enterprise tier', () => {
    const t = TIER_CONFIG.enterprise;
    expect(t.limits.monthlyLiveTournaments).toBe(-1);
    expect(t.limits.monthlySandboxTournaments).toBe(-1);
    expect(t.limits.allowNonSandbox).toBe(true);
    expect(t.features.leagues).toBe(true);
    expect(t.features.liveTracking).toBe(true);
    expect(t.features.detailedStatistics).toBe(true);
  });

  it('getTierConfig falls back to free for unknown tier', () => {
    expect(getTierConfig('nonexistent')).toBe(TIER_CONFIG.free);
    expect(getTierConfig('')).toBe(TIER_CONFIG.free);
  });

  it('every tier in club model enum has a TIER_CONFIG entry', () => {
    const clubTiers: TierId[] = ['free', 'basic', 'pro', 'enterprise'];
    for (const tier of clubTiers) {
      expect(TIER_CONFIG[tier]).toBeDefined();
      expect(TIER_CONFIG[tier].id).toBe(tier);
    }
  });
});

describe('SubscriptionService.canCreateTournament', () => {
  let snap: Record<string, string | undefined>;

  beforeEach(async () => {
    snap = snapshotEnv();
    await ClubModel.deleteMany({ name: /^tier-test-/ });
    await TournamentModel.deleteMany({ tournamentId: /^tier-test-/ });
  });

  afterEach(async () => {
    await ClubModel.deleteMany({ name: /^tier-test-/ });
    await TournamentModel.deleteMany({ tournamentId: /^tier-test-/ });
    restoreEnv(snap);
  });

  describe('paywall OFF', () => {
    beforeEach(() => {
      Reflect.deleteProperty(process.env, 'NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED');
    });

    it.each<TierId>(['free', 'basic', 'pro', 'enterprise'])(
      '%s tier: any tournament type allowed with maxAllowed=-1',
      async (tier) => {
        const club = await createClub(`tier-test-off-${tier}`, tier);
        const startDate = new Date();

        const live = await SubscriptionService.canCreateTournament(club._id.toString(), startDate, false, false);
        expect(live.canCreate).toBe(true);
        expect(live.maxAllowed).toBe(-1);

        const sandbox = await SubscriptionService.canCreateTournament(club._id.toString(), startDate, true, false);
        expect(sandbox.canCreate).toBe(true);
        expect(sandbox.maxAllowed).toBe(-1);

        const oac = await SubscriptionService.canCreateTournament(club._id.toString(), startDate, false, true);
        expect(oac.canCreate).toBe(true);
        expect(oac.maxAllowed).toBe(-1);
      }
    );
  });

  describe('paywall ON - free tier', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED = 'true';
    });

    it('blocks live tournament creation (allowNonSandbox=false)', async () => {
      const club = await createClub('tier-test-free-live', 'free');
      const check = await SubscriptionService.canCreateTournament(club._id.toString(), new Date(), false, false);
      expect(check.canCreate).toBe(false);
      expect(check.errorMessage).toBeDefined();
    });

    it('allows sandbox up to 5/month', async () => {
      const club = await createClub('tier-test-free-sandbox', 'free');
      const startDate = new Date();

      for (let i = 0; i < 5; i++) {
        await TournamentModel.create(tournamentDoc(club._id, startDate, `tier-test-free-sb-${i}`, { isSandbox: true }));
      }

      const check5 = await SubscriptionService.canCreateTournament(club._id.toString(), startDate, true, false);
      expect(check5.canCreate).toBe(false);
      expect(check5.currentCount).toBe(5);
      expect(check5.maxAllowed).toBe(5);
    });

    it('allows 1st-4th sandbox, blocks 6th', async () => {
      const club = await createClub('tier-test-free-sb-seq', 'free');
      const startDate = new Date();

      const check1 = await SubscriptionService.canCreateTournament(club._id.toString(), startDate, true, false);
      expect(check1.canCreate).toBe(true);

      for (let i = 0; i < 4; i++) {
        await TournamentModel.create(tournamentDoc(club._id, startDate, `tier-test-free-sb-seq-${i}`, { isSandbox: true }));
      }

      const check5 = await SubscriptionService.canCreateTournament(club._id.toString(), startDate, true, false);
      expect(check5.canCreate).toBe(true);

      await TournamentModel.create(tournamentDoc(club._id, startDate, `tier-test-free-sb-seq-5`, { isSandbox: true }));

      const check6 = await SubscriptionService.canCreateTournament(club._id.toString(), startDate, true, false);
      expect(check6.canCreate).toBe(false);
    });

    it('OAC tournaments are not checked by SubscriptionService (just passes through)', async () => {
      const club = await createClub('tier-test-free-oac', 'free');
      const check = await SubscriptionService.canCreateTournament(club._id.toString(), new Date(), false, true);
      expect(check.canCreate).toBe(true);
    });
  });

  describe('paywall ON - basic tier', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED = 'true';
    });

    it('allows 2 live tournaments, blocks 3rd', async () => {
      const club = await createClub('tier-test-basic-live', 'basic');
      const startDate = new Date();

      const check1 = await SubscriptionService.canCreateTournament(club._id.toString(), startDate, false, false);
      expect(check1.canCreate).toBe(true);

      await TournamentModel.create(tournamentDoc(club._id, startDate, `tier-test-basic-live-0`));
      await TournamentModel.create(tournamentDoc(club._id, startDate, `tier-test-basic-live-1`));

      const check3 = await SubscriptionService.canCreateTournament(club._id.toString(), startDate, false, false);
      expect(check3.canCreate).toBe(false);
      expect(check3.currentCount).toBe(2);
      expect(check3.maxAllowed).toBe(2);
    });

    it('sandbox is unlimited', async () => {
      const club = await createClub('tier-test-basic-sandbox', 'basic');
      const startDate = new Date();

      for (let i = 0; i < 20; i++) {
        await TournamentModel.create(tournamentDoc(club._id, startDate, `tier-test-basic-sb-${i}`, { isSandbox: true }));
      }

      const check = await SubscriptionService.canCreateTournament(club._id.toString(), startDate, true, false);
      expect(check.canCreate).toBe(true);
      expect(check.maxAllowed).toBe(-1);
    });

    it('OAC blocked by caller logic not SubscriptionService - service allows it', async () => {
      const club = await createClub('tier-test-basic-oac', 'basic');
      const check = await SubscriptionService.canCreateTournament(club._id.toString(), new Date(), false, true);
      expect(check.canCreate).toBe(true);
    });
  });

  describe('paywall ON - pro tier', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED = 'true';
    });

    it('allows 4 live tournaments, blocks 5th', async () => {
      const club = await createClub('tier-test-pro-live', 'pro');
      const startDate = new Date();

      for (let i = 0; i < 4; i++) {
        await TournamentModel.create(tournamentDoc(club._id, startDate, `tier-test-pro-live-${i}`));
      }

      const check = await SubscriptionService.canCreateTournament(club._id.toString(), startDate, false, false);
      expect(check.canCreate).toBe(false);
      expect(check.currentCount).toBe(4);
      expect(check.maxAllowed).toBe(4);
    });

    it('sandbox unlimited', async () => {
      const club = await createClub('tier-test-pro-sandbox', 'pro');
      const check = await SubscriptionService.canCreateTournament(club._id.toString(), new Date(), true, false);
      expect(check.canCreate).toBe(true);
      expect(check.maxAllowed).toBe(-1);
    });

    it('OAC allowed (verified pass-through)', async () => {
      const club = await createClub('tier-test-pro-oac', 'pro');
      const check = await SubscriptionService.canCreateTournament(club._id.toString(), new Date(), false, true);
      expect(check.canCreate).toBe(true);
    });
  });

  describe('paywall ON - enterprise tier', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED = 'true';
    });

    it('unlimited live tournaments', async () => {
      const club = await createClub('tier-test-ent-live', 'enterprise');
      const startDate = new Date();

      for (let i = 0; i < 50; i++) {
        await TournamentModel.create(tournamentDoc(club._id, startDate, `tier-test-ent-live-${i}`));
      }

      const check = await SubscriptionService.canCreateTournament(club._id.toString(), startDate, false, false);
      expect(check.canCreate).toBe(true);
      expect(check.maxAllowed).toBe(-1);
    });

    it('sandbox unlimited', async () => {
      const club = await createClub('tier-test-ent-sandbox', 'enterprise');
      const check = await SubscriptionService.canCreateTournament(club._id.toString(), new Date(), true, false);
      expect(check.canCreate).toBe(true);
    });
  });

  describe('verified/OAC tournaments do not count toward live or sandbox limits', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED = 'true';
    });

    it('verified tournaments are excluded from live count', async () => {
      const club = await createClub('tier-test-oac-excl', 'basic');
      const startDate = new Date();

      await TournamentModel.create(tournamentDoc(club._id, startDate, 'tier-test-oac-excl-v1', { verified: true }));
      await TournamentModel.create(tournamentDoc(club._id, startDate, 'tier-test-oac-excl-v2', { verified: true }));

      const check = await SubscriptionService.canCreateTournament(club._id.toString(), startDate, false, false);
      expect(check.canCreate).toBe(true);
      expect(check.currentCount).toBe(0);
    });
  });
});

describe('SubscriptionService.canUpdateTournament', () => {
  let snap: Record<string, string | undefined>;

  beforeEach(async () => {
    snap = snapshotEnv();
    await ClubModel.deleteMany({ name: /^tier-upd-/ });
    await TournamentModel.deleteMany({ tournamentId: /^tier-upd-/ });
  });

  afterEach(async () => {
    await ClubModel.deleteMany({ name: /^tier-upd-/ });
    await TournamentModel.deleteMany({ tournamentId: /^tier-upd-/ });
    restoreEnv(snap);
  });

  it('paywall OFF: any tier can update', async () => {
    Reflect.deleteProperty(process.env, 'NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED');
    const club = await createClub('tier-upd-off', 'free');
    const check = await SubscriptionService.canUpdateTournament(club._id.toString(), new Date());
    expect(check.canUpdate).toBe(true);
    expect(check.maxAllowed).toBe(-1);
  });

  it('paywall ON: update within limit OK', async () => {
    process.env.NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED = 'true';
    const club = await createClub('tier-upd-ok', 'basic');
    const startDate = new Date();

    await TournamentModel.create(tournamentDoc(club._id, startDate, 'tier-upd-ok-0'));

    const check = await SubscriptionService.canUpdateTournament(club._id.toString(), startDate);
    expect(check.canUpdate).toBe(true);
  });

  it('paywall ON: update at limit excluding self OK', async () => {
    process.env.NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED = 'true';
    const club = await createClub('tier-upd-self', 'basic');
    const startDate = new Date();

    await TournamentModel.create(tournamentDoc(club._id, startDate, 'tier-upd-self-0'));
    await TournamentModel.create(tournamentDoc(club._id, startDate, 'tier-upd-self-1'));

    const check = await SubscriptionService.canUpdateTournament(club._id.toString(), startDate, 'tier-upd-self-1');
    expect(check.canUpdate).toBe(true);
    expect(check.currentCount).toBe(1);
  });

  it('paywall ON: update over limit blocked', async () => {
    process.env.NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED = 'true';
    const club = await createClub('tier-upd-block', 'basic');
    const startDate = new Date();

    await TournamentModel.create(tournamentDoc(club._id, startDate, 'tier-upd-block-0'));
    await TournamentModel.create(tournamentDoc(club._id, startDate, 'tier-upd-block-1'));

    const check = await SubscriptionService.canUpdateTournament(club._id.toString(), startDate);
    expect(check.canUpdate).toBe(false);
  });
});

describe('OAC weekly limit (club.verified, not tier)', () => {
  beforeEach(async () => {
    await ClubModel.deleteMany({ name: /^oac-week-/ });
    await TournamentModel.deleteMany({ tournamentId: /^oac-week-/ });
  });

  afterEach(async () => {
    await ClubModel.deleteMany({ name: /^oac-week-/ });
    await TournamentModel.deleteMany({ tournamentId: /^oac-week-/ });
  });

  it('club.verified=false: no OAC tournament found, but club is not verified (caller responsibility)', async () => {
    const club = await createClub('oac-week-unverified', 'pro', false);
    expect(club.verified).toBe(false);
  });

  it('club.verified=true + no OAC this week: findExistingVerifiedTournamentForWeek returns null', async () => {
    const club = await createClub('oac-week-empty', 'pro', true);
    const monday = new Date('2026-04-13');
    const saturday = new Date('2026-04-18T23:59:59.999Z');
    const result = await findExistingVerifiedTournamentForWeek(club._id.toString(), monday, saturday);
    expect(result).toBeNull();
  });

  it('club.verified=true + OAC on Monday, try Thursday same week: BLOCKED', async () => {
    const club = await createClub('oac-week-dup', 'pro', true);
    const monday = new Date('2026-04-13T10:00:00Z');
    const weekStart = new Date('2026-04-13T00:00:00Z');
    const weekEnd = new Date('2026-04-18T23:59:59.999Z');

    await TournamentModel.create(tournamentDoc(club._id, monday, 'oac-week-dup-mon', {
      verified: true,
      isSandbox: false,
      isCancelled: false,
    }));

    const result = await findExistingVerifiedTournamentForWeek(club._id.toString(), weekStart, weekEnd);
    expect(result).not.toBeNull();
  });

  it('club.verified=true + OAC last week, new week: allowed', async () => {
    const club = await createClub('oac-week-new', 'pro', true);
    const lastMonday = new Date('2026-04-06T10:00:00Z');
    const thisWeekStart = new Date('2026-04-13T00:00:00Z');
    const thisWeekEnd = new Date('2026-04-18T23:59:59.999Z');

    await TournamentModel.create(tournamentDoc(club._id, lastMonday, 'oac-week-new-old', {
      verified: true,
      isSandbox: false,
      isCancelled: false,
    }));

    const result = await findExistingVerifiedTournamentForWeek(club._id.toString(), thisWeekStart, thisWeekEnd);
    expect(result).toBeNull();
  });
});
