process.env.OAC_STRIPE_SECRET_KEY = process.env.OAC_STRIPE_SECRET_KEY || 'sk_test_dummy';

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    checkout: { sessions: { create: jest.fn() } },
  }));
});

jest.mock('@/features/auth/lib/authorizeUser', () => ({
  authorizeUserResult: jest.fn(),
}));

jest.mock('@/features/flags/lib/eligibility', () => ({
  assertEligibilityResult: jest.fn(),
}));

import { createTournamentAction } from '@/features/tournaments/actions/createTournament.action';
import { authorizeUserResult } from '@/features/auth/lib/authorizeUser';

describe('createTournamentAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns auth denial before tournament orchestration', async () => {
    (authorizeUserResult as jest.Mock).mockResolvedValue({
      ok: false,
      code: 'UNAUTHORIZED',
      status: 401,
      message: 'Unauthorized',
    });

    const result = await createTournamentAction({
      request: { headers: new Headers() } as any,
      clubId: 'club-1',
      payload: {},
    });

    expect(result).toMatchObject({
      ok: false,
      code: 'UNAUTHORIZED',
      status: 401,
    });
  });
});
