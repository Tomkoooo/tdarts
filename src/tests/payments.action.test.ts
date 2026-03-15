process.env.OAC_STRIPE_SECRET_KEY = process.env.OAC_STRIPE_SECRET_KEY || 'sk_test_dummy';

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    checkout: { sessions: { retrieve: jest.fn() } },
  }));
});

jest.mock('@/features/auth/lib/authorizeUser', () => ({
  authorizeUserResult: jest.fn(),
}));

jest.mock('@/features/flags/lib/eligibility', () => ({
  assertEligibilityResult: jest.fn(),
}));

jest.mock('@/lib/szamlazz', () => ({
  SzamlazzService: {
    createOacInvoice: jest.fn(),
  },
}));

jest.mock('@/lib/mongoose', () => ({
  connectMongo: jest.fn(),
}));

import { verifyPaymentAction } from '@/features/payments/actions/verifyPayment.action';
import { authorizeUserResult } from '@/features/auth/lib/authorizeUser';

describe('verifyPaymentAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns auth denial before payment flow', async () => {
    (authorizeUserResult as jest.Mock).mockResolvedValue({
      ok: false,
      code: 'UNAUTHORIZED',
      status: 401,
      message: 'Unauthorized',
    });

    const result = await verifyPaymentAction({ sessionId: 'sess_1' });
    expect(result).toMatchObject({
      ok: false,
      code: 'UNAUTHORIZED',
      status: 401,
    });
  });
});
