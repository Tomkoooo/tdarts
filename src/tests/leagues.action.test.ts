jest.mock('@/features/auth/lib/authorizeUser', () => ({
  authorizeUserResult: jest.fn(),
}));

jest.mock('@/features/flags/lib/eligibility', () => ({
  assertEligibilityResult: jest.fn(),
}));

jest.mock('@/database/services/league.service', () => ({
  LeagueService: {
    createLeague: jest.fn(),
  },
}));

import { createLeagueAction } from '@/features/leagues/actions/createLeague.action';
import { authorizeUserResult } from '@/features/auth/lib/authorizeUser';
import { assertEligibilityResult } from '@/features/flags/lib/eligibility';
import { LeagueService } from '@/database/services/league.service';

describe('createLeagueAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates league on successful guard chain', async () => {
    (authorizeUserResult as jest.Mock).mockResolvedValue({ ok: true, data: { userId: 'u1' } });
    (assertEligibilityResult as jest.Mock).mockResolvedValue({
      ok: true,
      data: { allowed: true, paidOverride: true, reason: 'paid_override' },
    });
    (LeagueService.createLeague as jest.Mock).mockResolvedValue({ _id: 'l1' });

    const result = await createLeagueAction({ clubId: 'club-1', name: 'League 1' });

    expect(LeagueService.createLeague).toHaveBeenCalled();
    expect(result).toEqual({ _id: 'l1' });
  });
});
