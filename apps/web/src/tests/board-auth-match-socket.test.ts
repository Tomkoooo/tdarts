/**
 * Board auth: match save actions and board socket token issuance.
 * Verifies checked-in user OR tournament password works; neither is rejected.
 */

jest.mock('@/features/auth/lib/authorizeUser', () => ({
  authorizeUserResult: jest.fn(),
}));

jest.mock('@/lib/mongoose', () => ({
  connectMongo: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('next/cache', () => ({
  revalidateTag: jest.fn(),
}));

jest.mock('@tdarts/services', () => ({
  ...jest.requireActual('@tdarts/services'),
  TournamentService: {
    ...jest.requireActual('@tdarts/services').TournamentService,
    validateTournamentByPassword: jest.fn(),
    getPlayerStatusInTournament: jest.fn(),
    getTournamentRoleContext: jest.fn(),
  },
  MatchService: {
    ...jest.requireActual('@tdarts/services').MatchService,
    finishLeg: jest.fn(),
    undoLastLeg: jest.fn(),
    finishMatch: jest.fn(),
    getTournamentIdStringForMatch: jest.fn(),
  },
  AuthorizationService: {
    checkAdminOrModerator: jest.fn(),
    isGlobalAdmin: jest.fn(),
  },
}));

import jwt from 'jsonwebtoken';
import { authorizeUserResult } from '@/features/auth/lib/authorizeUser';
import { AuthService, TournamentService, MatchService, AuthorizationService } from '@tdarts/services';
import { assertBoardAccess } from '@/features/board/lib/assertBoardAccess';
import { finishMatchLegAction, undoMatchLegAction } from '@/features/matches/actions/matchGameplay.action';
import { finishBoardMatchAction } from '@/features/board/actions/boardPage.action';
import { POST as boardSocketAuthPost } from '@/app/api/socket/board-auth/route';

const TOURNAMENT_ID = 'ABCD';
const MATCH_ID = 'mid';
const VALID_PASSWORD = 'board-secret';

const legPayload = {
  matchId: MATCH_ID,
  tournamentId: TOURNAMENT_ID,
  winner: 1 as const,
  player1Throws: [180],
  player2Throws: [140],
  legNumber: 1,
};

function mockNoUser() {
  (authorizeUserResult as jest.Mock).mockResolvedValue({ ok: false });
}

function mockCheckedInUser(userId = 'user-checked-in') {
  (authorizeUserResult as jest.Mock).mockResolvedValue({
    ok: true,
    data: { userId },
  });
  (TournamentService.getPlayerStatusInTournament as jest.Mock).mockResolvedValue('checked-in');
}

function mockPasswordOnly(valid = true) {
  mockNoUser();
  (TournamentService.validateTournamentByPassword as jest.Mock).mockResolvedValue(valid);
}

function mockNeitherAuth() {
  mockNoUser();
  (TournamentService.validateTournamentByPassword as jest.Mock).mockResolvedValue(false);
  (TournamentService.getPlayerStatusInTournament as jest.Mock).mockResolvedValue(null);
  (TournamentService.getTournamentRoleContext as jest.Mock).mockRejectedValue(new Error('no role'));
}

beforeEach(() => {
  jest.clearAllMocks();
  process.env.SOCKET_JWT_SECRET = process.env.SOCKET_JWT_SECRET || 'test_socket_jwt_secret';
  (MatchService.getTournamentIdStringForMatch as jest.Mock).mockResolvedValue(TOURNAMENT_ID);
  (MatchService.finishLeg as jest.Mock).mockResolvedValue(undefined);
  (MatchService.undoLastLeg as jest.Mock).mockResolvedValue(undefined);
  (MatchService.finishMatch as jest.Mock).mockResolvedValue({ tournamentCode: TOURNAMENT_ID });
});

// ---------------------------------------------------------------------------
// assertBoardAccess
// ---------------------------------------------------------------------------

describe('assertBoardAccess', () => {
  test('allows checked-in participant without password', async () => {
    mockCheckedInUser();
    await expect(
      assertBoardAccess({ tournamentId: TOURNAMENT_ID })
    ).resolves.toBeUndefined();
    expect(TournamentService.validateTournamentByPassword).not.toHaveBeenCalled();
  });

  test('allows valid tournament password without logged-in user', async () => {
    mockPasswordOnly(true);
    await expect(
      assertBoardAccess({ tournamentId: TOURNAMENT_ID, password: VALID_PASSWORD })
    ).resolves.toBeUndefined();
    expect(TournamentService.validateTournamentByPassword).toHaveBeenCalledWith(
      TOURNAMENT_ID,
      VALID_PASSWORD
    );
  });

  test('allows club admin when logged in but not checked-in', async () => {
    (authorizeUserResult as jest.Mock).mockResolvedValue({
      ok: true,
      data: { userId: 'admin-user' },
    });
    (TournamentService.getPlayerStatusInTournament as jest.Mock).mockResolvedValue('applied');
    (TournamentService.getTournamentRoleContext as jest.Mock).mockResolvedValue({ clubId: 'cid' });
    (AuthorizationService.checkAdminOrModerator as jest.Mock).mockResolvedValue(true);
    (AuthorizationService.isGlobalAdmin as jest.Mock).mockResolvedValue(false);

    await expect(
      assertBoardAccess({ tournamentId: TOURNAMENT_ID })
    ).resolves.toBeUndefined();
  });

  test('rejects when neither user auth nor password', async () => {
    mockNeitherAuth();
    await expect(
      assertBoardAccess({ tournamentId: TOURNAMENT_ID })
    ).rejects.toThrow('Unauthorized board access');
  });

  test('rejects invalid password when not logged in', async () => {
    mockPasswordOnly(false);
    await expect(
      assertBoardAccess({ tournamentId: TOURNAMENT_ID, password: 'wrong' })
    ).rejects.toThrow('Unauthorized board access');
  });
});

// ---------------------------------------------------------------------------
// Match save actions (finish leg / undo leg / finish match)
// ---------------------------------------------------------------------------

describe('finishMatchLegAction — board access', () => {
  test('saves leg with tournament password only', async () => {
    mockPasswordOnly(true);
    const result = await finishMatchLegAction({
      ...legPayload,
      password: VALID_PASSWORD,
    });
    expect(result).toMatchObject({ success: true, matchId: MATCH_ID });
    expect(MatchService.finishLeg).toHaveBeenCalledWith(
      MATCH_ID,
      expect.objectContaining({ winner: 1 })
    );
  });

  test('saves leg with checked-in user (no password)', async () => {
    mockCheckedInUser();
    const result = await finishMatchLegAction({
      ...legPayload,
      password: undefined,
    });
    expect(result).toMatchObject({ success: true });
    expect(MatchService.finishLeg).toHaveBeenCalled();
  });

  test('rejects leg save without user auth or password', async () => {
    mockNeitherAuth();
    await expect(
      finishMatchLegAction({ ...legPayload, password: undefined })
    ).rejects.toThrow('Unauthorized board access');
    expect(MatchService.finishLeg).not.toHaveBeenCalled();
  });
});

describe('undoMatchLegAction — board access', () => {
  test('undoes leg with tournament password only', async () => {
    mockPasswordOnly(true);
    const result = await undoMatchLegAction({
      matchId: MATCH_ID,
      tournamentId: TOURNAMENT_ID,
      password: VALID_PASSWORD,
    });
    expect(result).toMatchObject({ success: true, matchId: MATCH_ID });
    expect(MatchService.undoLastLeg).toHaveBeenCalledWith(MATCH_ID);
  });

  test('undoes leg with checked-in user', async () => {
    mockCheckedInUser();
    const result = await undoMatchLegAction({
      matchId: MATCH_ID,
      tournamentId: TOURNAMENT_ID,
    });
    expect(result).toMatchObject({ success: true });
    expect(MatchService.undoLastLeg).toHaveBeenCalled();
  });

  test('rejects undo without user auth or password', async () => {
    mockNeitherAuth();
    await expect(
      undoMatchLegAction({ matchId: MATCH_ID, tournamentId: TOURNAMENT_ID })
    ).rejects.toThrow('Unauthorized board access');
    expect(MatchService.undoLastLeg).not.toHaveBeenCalled();
  });
});

describe('finishBoardMatchAction — board access', () => {
  const finishPayload = {
    tournamentId: TOURNAMENT_ID,
    matchId: MATCH_ID,
    player1LegsWon: 3,
    player2LegsWon: 1,
  };

  test('finishes match with password only', async () => {
    mockPasswordOnly(true);
    const result = await finishBoardMatchAction({
      ...finishPayload,
      password: VALID_PASSWORD,
    });
    expect(result).toMatchObject({ success: true });
    expect(MatchService.finishMatch).toHaveBeenCalled();
  });

  test('finishes match with checked-in user', async () => {
    mockCheckedInUser();
    const result = await finishBoardMatchAction(finishPayload);
    expect(result).toMatchObject({ success: true });
    expect(MatchService.finishMatch).toHaveBeenCalled();
  });

  test('rejects finish without user auth or password', async () => {
    mockNeitherAuth();
    await expect(finishBoardMatchAction(finishPayload)).rejects.toThrow(
      'Unauthorized board access'
    );
    expect(MatchService.finishMatch).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Board socket token (POST /api/socket/board-auth)
// ---------------------------------------------------------------------------

describe('POST /api/socket/board-auth', () => {
  async function requestBoardToken(body: { tournamentId: string; password?: string }) {
    return boardSocketAuthPost(
      new Request('http://localhost/api/socket/board-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    );
  }

  test('returns socket token with valid tournament password', async () => {
    mockPasswordOnly(true);
    const response = await requestBoardToken({
      tournamentId: TOURNAMENT_ID,
      password: VALID_PASSWORD,
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.token).toBeTruthy();
    expect(body.socketToken).toBe(body.token);
    expect(body.expiresInSec).toBeGreaterThan(0);

    const decoded = jwt.verify(body.token, process.env.SOCKET_JWT_SECRET!) as {
      authType?: string;
      tournamentId?: string;
      userRole?: string;
      purpose?: string;
    };
    expect(decoded.authType).toBe('board');
    expect(decoded.tournamentId).toBe(TOURNAMENT_ID);
    expect(decoded.userRole).toBe('board_scorer');
    expect(decoded.purpose).toBe('socket');
  });

  test('returns socket token for checked-in user without password', async () => {
    mockCheckedInUser();
    const response = await requestBoardToken({ tournamentId: TOURNAMENT_ID });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.token).toBeTruthy();

    const { token, expiresInSec } = AuthService.issueBoardSocketToken(TOURNAMENT_ID);
    expect(expiresInSec).toBeGreaterThan(0);
    expect(token.split('.')).toHaveLength(3);
  });

  test('returns 401 when neither user auth nor password', async () => {
    mockNeitherAuth();
    const response = await requestBoardToken({ tournamentId: TOURNAMENT_ID });
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toContain('Unauthorized');
  });

  test('returns 401 for wrong password when not logged in', async () => {
    mockPasswordOnly(false);
    const response = await requestBoardToken({
      tournamentId: TOURNAMENT_ID,
      password: 'wrong',
    });
    expect(response.status).toBe(401);
  });
});
