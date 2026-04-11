jest.mock('@/features/auth/lib/authorizeUser', () => ({
  authorizeUserResult: jest.fn(),
}));

jest.mock('@/features/flags/lib/eligibility', () => ({
  assertEligibilityResult: jest.fn(),
}));

jest.mock('@tdarts/services', () => ({
  ...jest.requireActual('@tdarts/services'),
  ClubService: {
    updateClub: jest.fn(),
  },
}));

import { updateClubAction } from '@/features/clubs/actions/updateClub.action';
import { authorizeUserResult } from '@/features/auth/lib/authorizeUser';
import { assertEligibilityResult } from '@/features/flags/lib/eligibility';
import { ClubService } from '@tdarts/services';

describe('updateClubAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns feature denial without executing domain call', async () => {
    (authorizeUserResult as jest.Mock).mockResolvedValue({ ok: true, data: { userId: 'u1' } });
    (assertEligibilityResult as jest.Mock).mockResolvedValue({
      ok: false,
      code: 'FEATURE_DISABLED',
      status: 403,
      message: 'Feature disabled',
    });
    const result = await updateClubAction({ clubId: 'club-1', updates: { name: 'A' } });
    expect(result).toMatchObject({ ok: false, status: 403 });
    expect(ClubService.updateClub).not.toHaveBeenCalled();
  });
});
