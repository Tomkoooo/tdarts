process.env.OAC_STRIPE_SECRET_KEY = process.env.OAC_STRIPE_SECRET_KEY || 'sk_test_dummy';

const stripeCheckoutCreate = jest.fn();

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    checkout: { sessions: { create: stripeCheckoutCreate } },
  }));
});

jest.mock('@/lib/szamlazz', () => ({
  SzamlazzService: { createOacInvoice: jest.fn() },
}));

jest.mock('@/features/auth/lib/authorizeUser', () => ({
  authorizeUserResult: jest.fn(),
}));

jest.mock('@tdarts/services', () => ({
  ...jest.requireActual('@tdarts/services'),
  ClubService: {
    getClub: jest.fn(),
    updateClub: jest.fn(),
  },
  SubscriptionService: {
    canCreateTournament: jest.fn(),
  },
  AuthorizationService: {
    checkAdminOrModerator: jest.fn().mockResolvedValue(true),
  },
}));

jest.mock('@/features/tournaments/lib/tournamentCreation.db', () => ({
  createPendingTournament: jest.fn(),
  findExistingVerifiedTournamentForWeek: jest.fn(),
  findLeagueById: jest.fn(),
}));

import { createTournamentAction } from '@/features/tournaments/actions/createTournament.action';
import { authorizeUserResult } from '@/features/auth/lib/authorizeUser';
import { ClubService, SubscriptionService } from '@tdarts/services';
import {
  createPendingTournament,
  findExistingVerifiedTournamentForWeek,
} from '@/features/tournaments/lib/tournamentCreation.db';
import { NextRequest } from 'next/server';

describe('createTournamentAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    stripeCheckoutCreate.mockResolvedValue({
      id: 'cs_test_verify',
      url: 'https://checkout.stripe.test/session',
    });
    (ClubService.getClub as jest.Mock).mockResolvedValue({
      _id: { toString: () => 'club-mongo-id' },
    });
    (SubscriptionService.canCreateTournament as jest.Mock).mockResolvedValue({ canCreate: true });
    (findExistingVerifiedTournamentForWeek as jest.Mock).mockResolvedValue(null);
  });

  it('returns auth denial before tournament orchestration', async () => {
    (authorizeUserResult as jest.Mock).mockResolvedValue({
      ok: false,
      message: 'Unauthorized',
    });

    const result = await createTournamentAction({
      request: { headers: new Headers() } as any,
      clubId: 'club-1',
      payload: {
        name: 'Test tournament',
        boards: [{}],
      },
    });

    expect(result).toMatchObject({
      ok: false,
      code: 'LOGIN_REQUIRED',
      status: 401,
    });
  });

  it('calls getClub before Stripe checkout when creating a verified (OAC) tournament', async () => {
    (authorizeUserResult as jest.Mock).mockResolvedValue({
      ok: true,
      data: { userId: 'user-1' },
      message: '',
    });

    const result = await createTournamentAction({
      request: new NextRequest('http://localhost/', {
        headers: { cookie: 'NEXT_LOCALE=hu' },
      }),
      clubId: 'club-xyz',
      payload: {
        name: 'OAC weekly',
        boards: [{ boardNumber: 1, name: 'B1' }],
        verified: true,
      },
    });

    expect(ClubService.getClub).toHaveBeenCalledWith('club-xyz');
    expect(stripeCheckoutCreate).toHaveBeenCalled();
    expect(stripeCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        success_url: expect.stringContaining('/api/payments/verify?session_id='),
        cancel_url: expect.stringMatching(/\/hu\/clubs\/club-xyz$/),
      })
    );
    expect(createPendingTournament).toHaveBeenCalledWith(
      'cs_test_verify',
      expect.objectContaining({
        verified: true,
        paymentStatus: 'pending',
      })
    );
    expect(result).toEqual({ checkoutUrl: 'https://checkout.stripe.test/session' });
  });
});
