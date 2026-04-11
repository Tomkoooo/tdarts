jest.mock('@/features/auth/lib/authorizeUser', () => ({
  authorizeUserResult: jest.fn(),
}));

jest.mock('@/features/flags/lib/eligibility', () => ({
  assertEligibilityResult: jest.fn(),
}));

jest.mock('@tdarts/services', () => ({
  ...jest.requireActual('@tdarts/services'),
  TournamentService: {
    updateBoardStatusAfterMatch: jest.fn(),
  },
}));

import { updateBoardStatusAction } from '@/features/matches/actions/updateBoardStatus.action';
import { authorizeUserResult } from '@/features/auth/lib/authorizeUser';
import { assertEligibilityResult } from '@/features/flags/lib/eligibility';
import { TournamentService } from '@tdarts/services';

describe('updateBoardStatusAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns auth denial before domain call', async () => {
    (authorizeUserResult as jest.Mock).mockResolvedValue({
      ok: false,
      code: 'UNAUTHORIZED',
      status: 401,
      message: 'Unauthorized',
    });
    const result = await updateBoardStatusAction({ matchId: 'm1' });
    expect(result).toMatchObject({ ok: false, status: 401 });
    expect(TournamentService.updateBoardStatusAfterMatch).not.toHaveBeenCalled();
  });

  it('updates board status on success', async () => {
    (authorizeUserResult as jest.Mock).mockResolvedValue({ ok: true, data: { userId: 'u1' } });
    (assertEligibilityResult as jest.Mock).mockResolvedValue({
      ok: true,
      data: { allowed: true, paidOverride: true, reason: 'paid_override' },
    });
    (TournamentService.updateBoardStatusAfterMatch as jest.Mock).mockResolvedValue(true);
    const result = await updateBoardStatusAction({ matchId: 'm2' });
    expect(result).toEqual({
      success: true,
      message: 'Board status updated successfully',
    });
  });
});
