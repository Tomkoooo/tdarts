jest.mock('@/features/auth/lib/authorizeUser', () => ({
  authorizeUserResult: jest.fn(),
}));

jest.mock('@/features/flags/lib/eligibility', () => ({
  assertEligibilityResult: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { addTournamentPlayerAction, getTournamentPlayerAction } from '@/features/tournaments/actions/tournamentPlayers.action';
import { authorizeUserResult } from '@/features/auth/lib/authorizeUser';

describe('tournamentPlayers actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns auth denial for getTournamentPlayerAction', async () => {
    (authorizeUserResult as jest.Mock).mockResolvedValue({
      ok: false,
      code: 'UNAUTHORIZED',
      status: 401,
      message: 'Unauthorized',
    });
    const request = new NextRequest('http://localhost:3000/api/tournaments/ABCD/players', { method: 'GET' });
    const result = await getTournamentPlayerAction({ request });
    expect(result).toMatchObject({ ok: false, status: 401 });
  });

  it('returns auth denial for addTournamentPlayerAction', async () => {
    (authorizeUserResult as jest.Mock).mockResolvedValue({
      ok: false,
      code: 'UNAUTHORIZED',
      status: 401,
      message: 'Unauthorized',
    });
    const request = new NextRequest('http://localhost:3000/api/tournaments/ABCD/players', {
      method: 'POST',
      body: JSON.stringify({ name: 'Player One' }),
      headers: { 'content-type': 'application/json' },
    });
    const result = await addTournamentPlayerAction({ request, code: 'ABCD' });
    expect(result).toMatchObject({ ok: false, status: 401 });
  });
});
