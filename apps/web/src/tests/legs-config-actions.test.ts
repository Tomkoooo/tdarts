/**
 * Action-level tests for Tournament Legs-to-Win enforcement.
 * Covers Unit 5 (startBoardMatchAction enforcement) and Unit 6 (updateMatchGameplaySettingsAction auth).
 *
 * These tests mock authorizeUserResult and service calls so they can run without a real
 * Next.js request context.
 */

// ---------------------------------------------------------------------------
// Mocks — must be hoisted before imports
// ---------------------------------------------------------------------------

jest.mock('@/features/auth/lib/authorizeUser', () => ({
  authorizeUserResult: jest.fn(),
}));

jest.mock('next/cache', () => ({
  revalidateTag: jest.fn(),
}));

jest.mock('@tdarts/services', () => ({
  ...jest.requireActual('@tdarts/services'),
  TournamentService: {
    ...jest.requireActual('@tdarts/services').TournamentService,
    getTournamentLite: jest.fn(),
    getTournamentRoleContext: jest.fn(),
  },
  MatchService: {
    startMatch: jest.fn(),
  },
  AuthorizationService: {
    checkAdminOrModerator: jest.fn(),
    isGlobalAdmin: jest.fn(),
  },
  ClubService: {
    getUserRoleInClub: jest.fn(),
  },
}));

jest.mock('@tdarts/core', () => ({
  ...jest.requireActual('@tdarts/core'),
  MatchModel: {
    findById: jest.fn(),
  },
  TournamentModel: {
    findById: jest.fn(),
  },
}));

import { authorizeUserResult } from '@/features/auth/lib/authorizeUser';
import { TournamentService, MatchService, AuthorizationService } from '@tdarts/services';
import { MatchModel, TournamentModel } from '@tdarts/core';
import { startBoardMatchAction } from '@/features/board/actions/boardPage.action';
import { updateMatchGameplaySettingsAction } from '@/features/matches/actions/matchGameplay.action';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockTournamentLite = (legsConfig?: object) => {
  (TournamentService.getTournamentLite as jest.Mock).mockResolvedValue({
    _id: 'tid',
    tournamentId: 'ABCD',
    clubId: 'cid',
    status: 'active',
    format: 'group',
    startingScore: 501,
    isSandbox: false,
    boards: [],
    legsConfig: legsConfig ?? undefined,
  });
};

const mockMatchLite = (type: 'group' | 'knockout', boardReference: number, round: number) => {
  (MatchModel.findById as jest.Mock).mockReturnValue({
    select: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue({ type, boardReference, round }),
    }),
  });
};

const mockMatchFull = (opts: { status?: string; type?: string; boardReference?: number; round?: number } = {}) => {
  const mockMatch = {
    _id: 'mid',
    status: opts.status ?? 'ongoing',
    tournamentRef: 'tid',
    legsToWin: 3,
    startingPlayer: 1,
    type: opts.type ?? 'group',
    boardReference: opts.boardReference ?? 1,
    round: opts.round ?? 1,
    save: jest.fn().mockResolvedValue(true),
  };
  (MatchModel.findById as jest.Mock).mockReturnValue({
    select: jest.fn().mockResolvedValue(mockMatch),
  });
  return mockMatch;
};

const mockTournamentForGameplay = (legsConfig?: object) => {
  (TournamentModel.findById as jest.Mock).mockReturnValue({
    select: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        tournamentId: 'ABCD',
        tournamentSettings: { legsConfig: legsConfig ?? undefined },
      }),
    }),
  });
};

const mockPrivilege = (isPrivileged: boolean, isGlobalAdmin = false) => {
  (TournamentService.getTournamentRoleContext as jest.Mock).mockResolvedValue({ clubId: 'cid' });
  (AuthorizationService.checkAdminOrModerator as jest.Mock).mockResolvedValue(isPrivileged);
  (AuthorizationService.isGlobalAdmin as jest.Mock).mockResolvedValue(isGlobalAdmin);
};

beforeEach(() => {
  jest.clearAllMocks();
  // Default: assertBoardAccess passes (password-based)
  (TournamentService as any).validateTournamentByPassword = jest.fn().mockResolvedValue(true);
  (TournamentService as any).getPlayerStatusInTournament = jest.fn().mockResolvedValue(null);
  (TournamentService as any).getTournamentRoleContext = jest.fn().mockResolvedValue({ clubId: 'cid' });
});

// ---------------------------------------------------------------------------
// Unit 5: startBoardMatchAction — legsToWin enforcement
// ---------------------------------------------------------------------------

describe('Unit 5: startBoardMatchAction — legsToWin enforcement', () => {
  test('no config: regular scorer submits any legsToWin → accepted', async () => {
    mockTournamentLite(undefined);
    mockMatchLite('group', 1, 1);
    (authorizeUserResult as jest.Mock).mockResolvedValue({ ok: false });
    (MatchService.startMatch as jest.Mock).mockResolvedValue({ tournamentCode: 'ABCD' });

    const result = await startBoardMatchAction({
      tournamentId: 'ABCD',
      boardNumber: 1,
      matchId: 'mid',
      legsToWin: 2,
      startingPlayer: 1,
      password: 'test123',
    });

    expect(result).toMatchObject({ success: true });
    expect(MatchService.startMatch).toHaveBeenCalledWith('ABCD', 'mid', 2, 1);
  });

  test('config set: regular scorer submits correct value → accepted', async () => {
    mockTournamentLite({ groups: { 1: 3 } });
    mockMatchLite('group', 1, 1);
    (authorizeUserResult as jest.Mock).mockResolvedValue({
      ok: true,
      data: { userId: 'uid-regular' },
    });
    mockPrivilege(false);
    (MatchService.startMatch as jest.Mock).mockResolvedValue({ tournamentCode: 'ABCD' });

    const result = await startBoardMatchAction({
      tournamentId: 'ABCD',
      boardNumber: 1,
      matchId: 'mid',
      legsToWin: 3,
      startingPlayer: 1,
      password: 'test123',
    });

    expect(result).toMatchObject({ success: true });
  });

  test('config set: non-admin submits wrong value → rejected with error', async () => {
    mockTournamentLite({ groups: { 1: 3 } });
    mockMatchLite('group', 1, 1);
    (authorizeUserResult as jest.Mock).mockResolvedValue({
      ok: true,
      data: { userId: 'uid-regular' },
    });
    mockPrivilege(false);

    await expect(
      startBoardMatchAction({
        tournamentId: 'ABCD',
        boardNumber: 1,
        matchId: 'mid',
        legsToWin: 2,
        startingPlayer: 1,
        password: 'test123',
      })
    ).rejects.toThrow('legsToWin is set by the tournament organizer');
    expect(MatchService.startMatch).not.toHaveBeenCalled();
  });

  test('config set: admin submits different value (override) → accepted', async () => {
    mockTournamentLite({ groups: { 1: 3 } });
    mockMatchLite('group', 1, 1);
    (authorizeUserResult as jest.Mock).mockResolvedValue({
      ok: true,
      data: { userId: 'uid-admin' },
    });
    mockPrivilege(true);
    (MatchService.startMatch as jest.Mock).mockResolvedValue({ tournamentCode: 'ABCD' });

    const result = await startBoardMatchAction({
      tournamentId: 'ABCD',
      boardNumber: 1,
      matchId: 'mid',
      legsToWin: 5,
      startingPlayer: 1,
      password: 'test123',
    });

    expect(result).toMatchObject({ success: true });
    expect(MatchService.startMatch).toHaveBeenCalledWith('ABCD', 'mid', 5, 1);
  });

  test('legsToWin = 0 rejected by Zod validation before config check', async () => {
    await expect(
      startBoardMatchAction({
        tournamentId: 'ABCD',
        boardNumber: 1,
        matchId: 'mid',
        legsToWin: 0,
        startingPlayer: 1,
        password: 'test123',
      })
    ).rejects.toThrow();
    expect(MatchService.startMatch).not.toHaveBeenCalled();
  });

  test('legsToWin = 10 rejected by Zod validation (max is 9)', async () => {
    await expect(
      startBoardMatchAction({
        tournamentId: 'ABCD',
        boardNumber: 1,
        matchId: 'mid',
        legsToWin: 10,
        startingPlayer: 1,
        password: 'test123',
      })
    ).rejects.toThrow();
    expect(MatchService.startMatch).not.toHaveBeenCalled();
  });

  test('knockout config: round 2 = 5 legs, non-admin submits 3 → rejected', async () => {
    mockTournamentLite({ knockout: { 2: 5 } });
    mockMatchLite('knockout', 1, 2);
    (authorizeUserResult as jest.Mock).mockResolvedValue({
      ok: true,
      data: { userId: 'uid-regular' },
    });
    mockPrivilege(false);

    await expect(
      startBoardMatchAction({
        tournamentId: 'ABCD',
        boardNumber: 1,
        matchId: 'mid',
        legsToWin: 3,
        startingPlayer: 1,
        password: 'test123',
      })
    ).rejects.toThrow('legsToWin is set by the tournament organizer');
  });
});

// ---------------------------------------------------------------------------
// Unit 6: updateMatchGameplaySettingsAction — auth + config enforcement
// ---------------------------------------------------------------------------

describe('Unit 6: updateMatchGameplaySettingsAction — auth + config', () => {
  test('unauthenticated caller → rejected', async () => {
    (authorizeUserResult as jest.Mock).mockResolvedValue({
      ok: false,
      code: 'UNAUTHORIZED',
      status: 401,
      message: 'Unauthorized',
    });

    await expect(
      updateMatchGameplaySettingsAction({ matchId: 'mid', legsToWin: 3 })
    ).rejects.toThrow('Authentication required');
  });

  test('authenticated admin, config set → allowed', async () => {
    (authorizeUserResult as jest.Mock).mockResolvedValue({
      ok: true,
      data: { userId: 'uid-admin' },
    });
    const mockMatch = mockMatchFull({ type: 'group', boardReference: 1, round: 1 });
    mockTournamentForGameplay({ groups: { 1: 3 } });
    mockPrivilege(true);

    const result = await updateMatchGameplaySettingsAction({
      matchId: 'mid',
      legsToWin: 5,
    });

    expect(result).toMatchObject({ success: true });
    expect(mockMatch.save).toHaveBeenCalled();
  });

  test('authenticated non-admin, config set → rejected (403)', async () => {
    (authorizeUserResult as jest.Mock).mockResolvedValue({
      ok: true,
      data: { userId: 'uid-regular' },
    });
    mockMatchFull({ type: 'group', boardReference: 1, round: 1 });
    mockTournamentForGameplay({ groups: { 1: 3 } });
    mockPrivilege(false, false);

    await expect(
      updateMatchGameplaySettingsAction({ matchId: 'mid', legsToWin: 5 })
    ).rejects.toThrow('Only admins and moderators');
  });

  test('authenticated user, no config set → allowed (existing behavior)', async () => {
    (authorizeUserResult as jest.Mock).mockResolvedValue({
      ok: true,
      data: { userId: 'uid-regular' },
    });
    const mockMatch = mockMatchFull({ type: 'group', boardReference: 1, round: 1 });
    mockTournamentForGameplay(undefined);

    const result = await updateMatchGameplaySettingsAction({
      matchId: 'mid',
      legsToWin: 2,
    });

    expect(result).toMatchObject({ success: true });
    expect(mockMatch.save).toHaveBeenCalled();
  });
});
