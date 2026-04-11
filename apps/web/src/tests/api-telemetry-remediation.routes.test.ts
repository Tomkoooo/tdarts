import { NextRequest } from 'next/server';
import { POST as finishTournament } from '@/app/api/tournaments/[code]/finish/route';
import { POST as generateGroups } from '@/app/api/tournaments/[code]/generateGroups/route';
import { PATCH as movePlayerInGroup } from '@/app/api/tournaments/[code]/groups/[groupId]/move-player/route';
import { POST as promoteWaitlist } from '@/app/api/tournaments/[code]/waitlist/promote/route';
import { GET as getUserRole } from '@/app/api/tournaments/[code]/getUserRole/route';
import { TournamentService, AuthService, AuthorizationService } from '@tdarts/services';
import * as viewerContext from '@/lib/tournament-viewer-context';

jest.mock('@/lib/api-telemetry', () => ({
  withApiTelemetry: (_route: string, handler: any) => handler,
}));
jest.mock('@/lib/mongoose', () => ({
  connectMongo: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@tdarts/services', () => ({
  ...jest.requireActual('@tdarts/services'),
  AuthService: {
    verifyToken: jest.fn(),
  },
  TournamentService: {
    finishTournament: jest.fn(),
    getTournament: jest.fn(),
    generateGroups: jest.fn(),
    getTournamentRoleContext: jest.fn(),
  },
  AuthorizationService: {
    checkAdminOrModerator: jest.fn(),
  },
}));
jest.mock('@/lib/tournament-viewer-context');

describe('API telemetry remediation routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('finish route', () => {
    it('maps failed finish to 400 (not 500)', async () => {
      (AuthService.verifyToken as jest.Mock).mockResolvedValue({ _id: 'user_1' });
      (TournamentService.finishTournament as jest.Mock).mockResolvedValue(false);

      const request = new NextRequest('http://localhost:3000/api/tournaments/ABCD/finish', {
        method: 'POST',
        headers: { cookie: 'token=valid_token' },
        body: JSON.stringify({}),
      });

      const response = await finishTournament(request, { params: Promise.resolve({ code: 'ABCD' }) });
      expect(response.status).toBe(400);
    });

    it('returns 401 for invalid token', async () => {
      (AuthService.verifyToken as jest.Mock).mockRejectedValue(new Error('Invalid token'));

      const request = new NextRequest('http://localhost:3000/api/tournaments/ABCD/finish', {
        method: 'POST',
        headers: { cookie: 'token=invalid_token' },
        body: JSON.stringify({}),
      });

      const response = await finishTournament(request, { params: Promise.resolve({ code: 'ABCD' }) });
      expect(response.status).toBe(401);
    });

    it('keeps status stable under concurrent failed finish calls', async () => {
      (AuthService.verifyToken as jest.Mock).mockResolvedValue({ _id: 'user_1' });
      (TournamentService.finishTournament as jest.Mock).mockResolvedValue(false);

      const responses = await Promise.all(
        Array.from({ length: 8 }).map(() =>
          finishTournament(
            new NextRequest('http://localhost:3000/api/tournaments/ABCD/finish', {
              method: 'POST',
              headers: { cookie: 'token=valid_token' },
              body: JSON.stringify({}),
            }),
            { params: Promise.resolve({ code: 'ABCD' }) }
          )
        )
      );

      expect(responses.every((response) => response.status === 400)).toBe(true);
    });
  });

  describe('generateGroups route', () => {
    it('maps service false return to 400 instead of 501', async () => {
      (AuthService.verifyToken as jest.Mock).mockResolvedValue({ _id: 'user_1' });
      (TournamentService.getTournament as jest.Mock).mockResolvedValue({
        tournamentSettings: { startDate: new Date('2020-01-01').toISOString() },
      });
      (TournamentService.generateGroups as jest.Mock).mockResolvedValue(false);

      const request = new NextRequest('http://localhost:3000/api/tournaments/ABCD/generateGroups', {
        method: 'POST',
        headers: { cookie: 'token=valid_token' },
      });

      const response = await generateGroups(request, { params: Promise.resolve({ code: 'ABCD' }) });
      expect(response.status).toBe(400);
    });

    it('keeps status stable under concurrent failed group generation', async () => {
      (AuthService.verifyToken as jest.Mock).mockResolvedValue({ _id: 'user_1' });
      (TournamentService.getTournament as jest.Mock).mockResolvedValue({
        tournamentSettings: { startDate: new Date('2020-01-01').toISOString() },
      });
      (TournamentService.generateGroups as jest.Mock).mockResolvedValue(false);

      const responses = await Promise.all(
        Array.from({ length: 8 }).map(() =>
          generateGroups(
            new NextRequest('http://localhost:3000/api/tournaments/ABCD/generateGroups', {
              method: 'POST',
              headers: { cookie: 'token=valid_token' },
            }),
            { params: Promise.resolve({ code: 'ABCD' }) }
          )
        )
      );

      expect(responses.every((response) => response.status === 400)).toBe(true);
    });
  });

  describe('move-player route', () => {
    it('returns 401 for invalid token', async () => {
      (AuthService.verifyToken as jest.Mock).mockRejectedValue(new Error('Invalid token'));

      const request = new NextRequest('http://localhost:3000/api/tournaments/ABCD/groups/G1/move-player', {
        method: 'PATCH',
        headers: { cookie: 'token=invalid_token' },
        body: JSON.stringify({ playerId: 'p1', direction: 'up' }),
      });

      const response = await movePlayerInGroup(request, {
        params: Promise.resolve({ code: 'ABCD', groupId: 'G1' }),
      });

      expect(response.status).toBe(401);
    });

    it('returns 403 for user without admin/moderator permission', async () => {
      (AuthService.verifyToken as jest.Mock).mockResolvedValue({ _id: 'user_1' });
      (TournamentService.getTournamentRoleContext as jest.Mock).mockResolvedValue({ clubId: 'club_1' });
      (AuthorizationService.checkAdminOrModerator as jest.Mock).mockResolvedValue(false);

      const request = new NextRequest('http://localhost:3000/api/tournaments/ABCD/groups/G1/move-player', {
        method: 'PATCH',
        headers: { cookie: 'token=valid_token' },
        body: JSON.stringify({ playerId: 'p1', direction: 'up' }),
      });

      const response = await movePlayerInGroup(request, {
        params: Promise.resolve({ code: 'ABCD', groupId: 'G1' }),
      });

      expect(response.status).toBe(403);
    });
  });

  describe('waitlist promotion route', () => {
    it('returns 404 when tournament is missing', async () => {
      (AuthService.verifyToken as jest.Mock).mockResolvedValue({ _id: 'user_1' });
      (TournamentService.getTournament as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/tournaments/ABCD/waitlist/promote', {
        method: 'POST',
        headers: { cookie: 'token=valid_token' },
        body: JSON.stringify({ playerId: 'p1' }),
      });

      const response = await promoteWaitlist(request, { params: Promise.resolve({ code: 'ABCD' }) });
      expect(response.status).toBe(404);
    });

    it('returns 400 when playerId is missing', async () => {
      (AuthService.verifyToken as jest.Mock).mockResolvedValue({ _id: 'user_1' });

      const request = new NextRequest('http://localhost:3000/api/tournaments/ABCD/waitlist/promote', {
        method: 'POST',
        headers: { cookie: 'token=valid_token' },
        body: JSON.stringify({}),
      });

      const response = await promoteWaitlist(request, { params: Promise.resolve({ code: 'ABCD' }) });
      expect(response.status).toBe(400);
    });

    it('keeps status stable under concurrent invalid promotion payloads', async () => {
      (AuthService.verifyToken as jest.Mock).mockResolvedValue({ _id: 'user_1' });

      const responses = await Promise.all(
        Array.from({ length: 8 }).map(() =>
          promoteWaitlist(
            new NextRequest('http://localhost:3000/api/tournaments/ABCD/waitlist/promote', {
              method: 'POST',
              headers: { cookie: 'token=valid_token' },
              body: JSON.stringify({}),
            }),
            { params: Promise.resolve({ code: 'ABCD' }) }
          )
        )
      );

      expect(responses.every((response) => response.status === 400)).toBe(true);
    });
  });

  describe('getUserRole route', () => {
    it('returns non-error default context when token is invalid', async () => {
      (viewerContext.getTournamentViewerContextFromToken as jest.Mock).mockRejectedValue(new Error('Invalid token'));

      const request = new NextRequest('http://localhost:3000/api/tournaments/ABCD/getUserRole', {
        method: 'GET',
        headers: { cookie: 'token=invalid_token' },
      });

      const response = await getUserRole(request, { params: Promise.resolve({ code: 'ABCD' }) });
      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body).toMatchObject({
        userClubRole: 'none',
        userPlayerStatus: 'none',
      });
    });

    it('returns 404 default context when tournament is missing', async () => {
      (viewerContext.getTournamentViewerContextFromToken as jest.Mock).mockRejectedValue(
        new Error('Tournament not found')
      );

      const request = new NextRequest('http://localhost:3000/api/tournaments/ABCD/getUserRole', {
        method: 'GET',
        headers: { cookie: 'token=valid_token' },
      });

      const response = await getUserRole(request, { params: Promise.resolve({ code: 'ABCD' }) });
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body).toMatchObject({
        userClubRole: 'none',
        userPlayerStatus: 'none',
      });
    });
  });
});
