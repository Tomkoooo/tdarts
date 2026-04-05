jest.mock('@/features/flags/lib/featureAccess', () => ({
  evaluateFeatureAccess: jest.fn(),
}));

jest.mock('@/database/services/league.service', () => ({
  LeagueService: {
    createLeague: jest.fn(),
  },
}));

import { createLeagueAction } from '@/features/leagues/actions/createLeague.action';
import { evaluateFeatureAccess } from '@/features/flags/lib/featureAccess';
import { LeagueService } from '@/database/services/league.service';

describe('createLeagueAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates league on successful guard chain', async () => {
    (evaluateFeatureAccess as jest.Mock).mockResolvedValue({
      ok: true,
      data: { userId: 'u1', featureKey: 'LEAGUES', bypassReason: 'none' },
    });
    (LeagueService.createLeague as jest.Mock).mockResolvedValue({ _id: 'l1' });

    const result = await createLeagueAction({ clubId: 'club-1', name: 'League 1' });

    expect(LeagueService.createLeague).toHaveBeenCalled();
    expect(result).toEqual({ _id: 'l1' });
  });
});
