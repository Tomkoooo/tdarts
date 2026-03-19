jest.mock('next/cache', () => ({
  unstable_cache: (fn: () => unknown) => fn,
}));

jest.mock('@/database/services/tournament.service', () => ({
  TournamentService: {
    getTournamentSummaryForPublicPage: jest.fn(),
    getPlayerStatusInTournament: jest.fn(),
    getTournamentLite: jest.fn(),
  },
}));

jest.mock('@/database/services/club.service', () => ({
  ClubService: {
    getUserRoleInClub: jest.fn(),
  },
}));

jest.mock('@/shared/lib/guards', () => ({
  authorizeUserResult: jest.fn(),
}));

jest.mock('@/shared/lib/withTelemetry', () => ({
  withTelemetry: (_name: string, handler: (input: unknown) => Promise<unknown>) => {
    return async (input: unknown) => handler(input);
  },
}));

jest.mock('@/shared/lib/serializeForClient', () => ({
  serializeForClient: (payload: unknown) => payload,
}));

import { getTournamentPageDataAction } from '@/features/tournaments/actions/getTournamentPageData.action';
import { authorizeUserResult } from '@/shared/lib/guards';
import { TournamentService } from '@/database/services/tournament.service';
import { ClubService } from '@/database/services/club.service';

describe('getTournamentPageDataAction auth boundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (TournamentService.getTournamentSummaryForPublicPage as jest.Mock).mockResolvedValue({
      _id: 't1',
      code: 'ABC',
      clubId: 'club-123',
    });
  });

  it('uses session user id from authorizeUserResult for viewer role lookups', async () => {
    (authorizeUserResult as jest.Mock).mockResolvedValue({
      ok: true,
      data: { userId: 'session-user' },
    });
    (ClubService.getUserRoleInClub as jest.Mock).mockResolvedValue('member');
    (TournamentService.getPlayerStatusInTournament as jest.Mock).mockResolvedValue('checked-in');

    await getTournamentPageDataAction({
      code: 'ABC',
      includeViewer: true,
      userId: 'attacker-user',
    } as any);

    expect(ClubService.getUserRoleInClub).toHaveBeenCalledWith('session-user', 'club-123');
    expect(TournamentService.getPlayerStatusInTournament).toHaveBeenCalledWith('ABC', 'session-user');
    expect(ClubService.getUserRoleInClub).not.toHaveBeenCalledWith('attacker-user', 'club-123');
  });

  it('skips auth lookup when includeViewer is false', async () => {
    await getTournamentPageDataAction({ code: 'ABC', includeViewer: false });

    expect(authorizeUserResult).not.toHaveBeenCalled();
    expect(ClubService.getUserRoleInClub).not.toHaveBeenCalled();
    expect(TournamentService.getPlayerStatusInTournament).not.toHaveBeenCalled();
  });
});
