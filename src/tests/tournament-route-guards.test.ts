import { NextRequest } from 'next/server';
import { PUT as updateTournament } from '@/app/api/tournaments/[code]/route';
import { TournamentService } from '@/database/services/tournament.service';
import { SubscriptionService } from '@/database/services/subscription.service';
import { AuthorizationService } from '@/database/services/authorization.service';

jest.mock('@/database/services/tournament.service');
jest.mock('@/database/services/subscription.service');
jest.mock('@/database/services/authorization.service');

describe('Tournament PUT route guards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AuthorizationService.getUserIdFromRequest as jest.Mock).mockResolvedValue('user_1');
  });

  it('returns 400 when tournament has no valid club reference', async () => {
    (TournamentService.getTournament as jest.Mock).mockResolvedValue({
      tournamentId: 'ABCD',
      clubId: null,
      tournamentSettings: { startDate: '2026-03-01T00:00:00.000Z' },
    });

    const request = new NextRequest('http://localhost:3000/api/tournaments/ABCD', {
      method: 'PUT',
      body: JSON.stringify({ settings: { name: 'Updated name' } }),
    });

    const response = await updateTournament(request, { params: Promise.resolve({ code: 'ABCD' }) });
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json).toMatchObject({ error: 'Tournament is missing a valid club reference' });
  });

  it('returns 400 when boards is not an array', async () => {
    (TournamentService.getTournament as jest.Mock).mockResolvedValue({
      tournamentId: 'ABCD',
      clubId: { _id: 'club_1' },
      tournamentSettings: { startDate: '2026-03-01T00:00:00.000Z' },
      verified: false,
      league: null,
    });
    (SubscriptionService.canUpdateTournament as jest.Mock).mockResolvedValue({ canUpdate: true });

    const request = new NextRequest('http://localhost:3000/api/tournaments/ABCD', {
      method: 'PUT',
      body: JSON.stringify({
        settings: { name: 'Updated name' },
        boards: { invalid: true },
      }),
    });

    const response = await updateTournament(request, { params: Promise.resolve({ code: 'ABCD' }) });
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json).toMatchObject({ error: 'boards must be an array' });
  });
});
