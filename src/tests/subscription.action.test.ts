jest.mock('@/features/auth/lib/authorizeUser', () => ({
  authorizeUserResult: jest.fn(),
}));

jest.mock('@/features/flags/lib/eligibility', () => ({
  assertEligibilityResult: jest.fn(),
}));

jest.mock('@/features/subscription/lib/subscriptionEligibility', () => ({
  canCreateTournamentForSubscription: jest.fn(),
}));

import { checkSubscriptionAction } from '@/features/subscription/actions/checkSubscription.action';
import { authorizeUserResult } from '@/features/auth/lib/authorizeUser';
import { assertEligibilityResult } from '@/features/flags/lib/eligibility';
import { canCreateTournamentForSubscription } from '@/features/subscription/lib/subscriptionEligibility';

describe('checkSubscriptionAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('short-circuits on auth denial', async () => {
    (authorizeUserResult as jest.Mock).mockResolvedValue({
      ok: false,
      code: 'UNAUTHORIZED',
      status: 401,
      message: 'Unauthorized',
    });
    const result = await checkSubscriptionAction({
      clubId: 'club-1',
      startDate: new Date(),
      isSandbox: false,
      isVerified: false,
    });
    expect(result).toMatchObject({ ok: false, status: 401 });
    expect(assertEligibilityResult).not.toHaveBeenCalled();
  });

  it('executes domain check on allowed guard chain', async () => {
    (authorizeUserResult as jest.Mock).mockResolvedValue({ ok: true, data: { userId: 'u1' } });
    (assertEligibilityResult as jest.Mock).mockResolvedValue({
      ok: true,
      data: { allowed: true, paidOverride: true, reason: 'paid_override' },
    });
    (canCreateTournamentForSubscription as jest.Mock).mockResolvedValue({ canCreate: true });

    const startDate = new Date();
    const result = await checkSubscriptionAction({
      clubId: 'club-1',
      startDate,
      isSandbox: true,
      isVerified: true,
    });
    expect(canCreateTournamentForSubscription).toHaveBeenCalledWith('club-1', startDate, true, true);
    expect(result).toEqual({ canCreate: true });
  });
});
