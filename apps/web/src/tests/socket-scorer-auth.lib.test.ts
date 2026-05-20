import jwt from 'jsonwebtoken';
import { AuthService } from '@tdarts/services';
import {
  canEmitScorerEvent,
  guardScorerEmit,
  SCORER_SOCKET_EVENTS,
} from '@/lib/socketScorerAuth';

const TOURNAMENT_ID = 'T001';

beforeAll(() => {
  process.env.SOCKET_JWT_SECRET = process.env.SOCKET_JWT_SECRET || 'test_socket_jwt_secret';
});

describe('socket scorer emit authorization', () => {
  test('board token can emit scorer events for matching tournament', () => {
    const { token } = AuthService.issueBoardSocketToken(TOURNAMENT_ID);
    const decoded = jwt.verify(token, process.env.SOCKET_JWT_SECRET!) as {
      authType: string;
      tournamentId: string;
      userRole: string;
    };

    const socket = {
      authType: decoded.authType,
      boardTournamentId: decoded.tournamentId,
      userRole: decoded.userRole,
    };

    for (const event of SCORER_SOCKET_EVENTS) {
      expect(
        guardScorerEmit(socket, event, {
          matchId: 'm1',
          tournamentCode: TOURNAMENT_ID,
        })
      ).toBe(true);
    }
  });

  test('board token cannot emit scorer events for another tournament', () => {
    const socket = {
      authType: 'board',
      boardTournamentId: TOURNAMENT_ID,
      userRole: 'board_scorer',
    };

    expect(
      canEmitScorerEvent(socket, { matchId: 'm1', tournamentCode: 'OTHER' })
    ).toBe(false);
    expect(guardScorerEmit(socket, 'throw', { tournamentCode: 'OTHER' })).toBe(false);
  });

  test('guest user token cannot emit scorer events', () => {
    const socket = { authType: 'user', userRole: 'guest' };
    expect(
      guardScorerEmit(socket, 'leg-complete', { tournamentCode: TOURNAMENT_ID })
    ).toBe(false);
  });

  test('logged-in user token can emit scorer events', () => {
    const socket = { authType: 'user', userRole: 'user' };
    expect(
      guardScorerEmit(socket, 'throw', { tournamentCode: TOURNAMENT_ID })
    ).toBe(true);
  });

  test('join-tournament is not blocked by scorer guard', () => {
    const socket = { authType: 'guest', userRole: 'guest' };
    expect(guardScorerEmit(socket, 'join-tournament', { tournamentCode: TOURNAMENT_ID })).toBe(
      true
    );
  });
});
