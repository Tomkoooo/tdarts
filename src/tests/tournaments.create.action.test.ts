process.env.OAC_STRIPE_SECRET_KEY = process.env.OAC_STRIPE_SECRET_KEY || 'sk_test_dummy';

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    checkout: { sessions: { create: jest.fn() } },
  }));
});

jest.mock('@/features/flags/lib/featureAccess', () => ({
  evaluateFeatureAccess: jest.fn(),
}));

import { createTournamentAction } from '@/features/tournaments/actions/createTournament.action';
import { evaluateFeatureAccess } from '@/features/flags/lib/featureAccess';

describe('createTournamentAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns auth denial before tournament orchestration', async () => {
    (evaluateFeatureAccess as jest.Mock).mockResolvedValue({
      ok: false,
      code: 'LOGIN_REQUIRED',
      status: 401,
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
});
