import { NextRequest } from 'next/server';
import { POST as addTournamentPlayerRoute } from '@/app/api/tournaments/[code]/players/route';
import { TournamentModel } from '@tdarts/core';
import {
  AuthService,
  AuthorizationService,
  PlayerService,
  TournamentService,
} from '@tdarts/services';

jest.mock('@tdarts/services', () => ({
  ...jest.requireActual('@tdarts/services'),
  TournamentService: {
    addTournamentPlayer: jest.fn(),
  },
  PlayerService: {
    findOrCreatePlayerByName: jest.fn(),
    findOrCreateTeam: jest.fn(),
  },
  AuthService: {
    verifyToken: jest.fn(),
  },
  AuthorizationService: {
    checkAdminOrModerator: jest.fn(),
  },
  TeamInvitationService: {
    createInvitation: jest.fn(),
  },
  EmailTemplateService: {
    getRenderedTemplate: jest.fn(),
  },
}));

jest.mock('@tdarts/core', () => ({
  ...jest.requireActual('@tdarts/core'),
  PlayerModel: {
    findById: jest.fn(),
    find: jest.fn(),
  },
  TournamentModel: {
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
  },
  UserModel: {
    findById: jest.fn(),
    findOne: jest.fn(),
  },
}));

jest.mock('@/lib/mailer', () => ({
  sendEmail: jest.fn(),
}));

describe('Tournament players POST regression coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AuthService.verifyToken as jest.Mock).mockResolvedValue({ _id: 'user_1', name: 'Requester' });
    (AuthorizationService.checkAdminOrModerator as jest.Mock).mockResolvedValue(true);
    (TournamentService.addTournamentPlayer as jest.Mock).mockResolvedValue(true);
    (PlayerService.findOrCreatePlayerByName as jest.Mock)
      .mockResolvedValueOnce({ _id: 'player_1' })
      .mockResolvedValueOnce({ _id: 'player_2' });
    (PlayerService.findOrCreateTeam as jest.Mock).mockResolvedValue({ _id: 'team_1' });

    (TournamentModel.findOne as jest.Mock).mockImplementation(() => ({
      select: jest.fn().mockImplementation((projection: string) => {
        if (projection.includes('clubId')) {
          return Promise.resolve({
            clubId: { toString: () => 'club_1' },
            tournamentSettings: { participationMode: 'pair' },
            tournamentPlayers: [],
          });
        }
        if (projection === 'tournamentSettings') {
          return Promise.resolve({
            tournamentSettings: { participationMode: 'pair' },
          });
        }
        return Promise.resolve(null);
      }),
    }));
  });

  it('handles pair registration without TDZ crash and verifies token once', async () => {
    const request = new NextRequest('http://localhost:3000/api/tournaments/ABCD/players', {
      method: 'POST',
      headers: { cookie: 'token=valid_token' },
      body: JSON.stringify({
        name: 'Team Alpha',
        members: [{ name: 'Alice' }, { name: 'Bob' }],
      }),
    });

    const response = await addTournamentPlayerRoute(request, { params: Promise.resolve({ code: 'ABCD' }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toMatchObject({ success: true, playerId: 'team_1' });
    expect(AuthService.verifyToken).toHaveBeenCalledTimes(1);
    expect(TournamentService.addTournamentPlayer).toHaveBeenCalledWith('ABCD', 'team_1');
  });
});
