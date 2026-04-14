/**
 * createTournamentAction must match FEATURE_FLAGS.md: subscription quotas run only when paywall is active.
 * Unlike tournaments.create.action.test.ts, SubscriptionService is NOT mocked (spy only).
 */
process.env.OAC_STRIPE_SECRET_KEY = process.env.OAC_STRIPE_SECRET_KEY || 'sk_test_dummy';

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    checkout: { sessions: { create: jest.fn() } },
  }));
});

jest.mock('@/lib/szamlazz', () => ({
  SzamlazzService: { createOacInvoice: jest.fn() },
}));

jest.mock('next/cache', () => ({
  revalidateTag: jest.fn(),
}));

jest.mock('@/features/auth/lib/authorizeUser', () => ({
  authorizeUserResult: jest.fn().mockResolvedValue({
    ok: true,
    data: { userId: 'user-1' },
    message: '',
  }),
}));

jest.mock('@/features/tournaments/lib/tournamentCreation.db', () => ({
  createPendingTournament: jest.fn(),
  findExistingVerifiedTournamentForWeek: jest.fn().mockResolvedValue(null),
  findLeagueById: jest.fn(),
}));

jest.mock('@tdarts/services', () => {
  const actual = jest.requireActual('@tdarts/services');
  return {
    ...actual,
    ClubService: {
      getClub: jest.fn(),
      updateClub: jest.fn(),
    },
    AuthorizationService: {
      checkAdminOrModerator: jest.fn().mockResolvedValue(true),
    },
    TournamentService: {
      createTournament: jest.fn(),
    },
    LeagueService: {
      attachTournamentToLeague: jest.fn(),
    },
  };
});

import { createTournamentAction } from '@/features/tournaments/actions/createTournament.action';
import { ClubService, SubscriptionService, TournamentService } from '@tdarts/services';

describe('createTournamentAction subscription gate (UI parity)', () => {
  const snap: Partial<Record<'NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED', string | undefined>> = {};

  beforeAll(() => {
    snap.NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED = process.env.NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED;
  });

  afterAll(() => {
    if (snap.NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED === undefined) {
      Reflect.deleteProperty(process.env, 'NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED');
    } else {
      process.env.NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED = snap.NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED;
    }
  });

  let spyCanCreate: jest.SpiedFunction<typeof SubscriptionService.canCreateTournament>;

  beforeEach(() => {
    jest.clearAllMocks();
    (ClubService.getClub as jest.Mock).mockResolvedValue({
      _id: { toString: () => 'club-gate-1' },
    });
    (TournamentService.createTournament as jest.Mock).mockResolvedValue({
      _id: { toString: () => 'new-tid' },
      tournamentId: 'GATE99',
    });
    spyCanCreate = jest.spyOn(SubscriptionService, 'canCreateTournament');
  });

  afterEach(() => {
    spyCanCreate.mockRestore();
  });

  it('paywall inactive: never calls canCreateTournament (no subscription-limit error path)', async () => {
    Reflect.deleteProperty(process.env, 'NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED');

    await createTournamentAction({
      clubId: 'club-gate-1',
      payload: { name: 'Gate test', boards: [{ boardNumber: 1, name: 'B1' }] },
    });

    expect(spyCanCreate).not.toHaveBeenCalled();
    expect(TournamentService.createTournament).toHaveBeenCalled();
  });

  it('paywall active: calls canCreateTournament and returns SUBSCRIPTION_REQUIRED when denied', async () => {
    process.env.NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED = 'true';
    spyCanCreate.mockResolvedValue({
      canCreate: false,
      currentCount: 3,
      maxAllowed: 3,
      tierName: 'basic',
      errorMessage: 'Havi limit elerve',
    });

    const result = await createTournamentAction({
      clubId: 'club-gate-1',
      payload: { name: 'Gate test', boards: [{ boardNumber: 1, name: 'B1' }] },
    });

    expect(spyCanCreate).toHaveBeenCalledWith(
      'club-gate-1',
      expect.any(Date),
      false,
      false
    );
    expect(result).toEqual(
      expect.objectContaining({
        ok: false,
        code: 'SUBSCRIPTION_REQUIRED',
        status: 403,
        message: 'Havi limit elerve',
      })
    );
    expect(TournamentService.createTournament).not.toHaveBeenCalled();
  });

  it('paywall active: creates tournament when canCreateTournament allows', async () => {
    process.env.NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED = 'true';
    spyCanCreate.mockResolvedValue({
      canCreate: true,
      currentCount: 0,
      maxAllowed: 3,
      tierName: 'basic',
    });

    await createTournamentAction({
      clubId: 'club-gate-1',
      payload: { name: 'Gate test', boards: [{ boardNumber: 1, name: 'B1' }] },
    });

    expect(spyCanCreate).toHaveBeenCalled();
    expect(TournamentService.createTournament).toHaveBeenCalled();
  });
});
