import { NextRequest } from 'next/server';
import { GET as getTournament } from '@/app/api/tournaments/[code]/route';
import { GET as getKnockout } from '@/app/api/tournaments/[code]/knockout/route';
import { GET as getBoardMatches } from '@/app/api/boards/[tournamentId]/[boardNumber]/matches/route';
import { GET as getUserRole } from '@/app/api/tournaments/[code]/getUserRole/route';
import { POST as searchRoute } from '@/app/api/search/route';
import { TournamentService } from '@/database/services/tournament.service';
import { MatchService } from '@/database/services/match.service';
import { SearchService } from '@/database/services/search.service';
import { AuthService } from '@/database/services/auth.service';
import { ClubService } from '@/database/services/club.service';

jest.mock('@/database/services/tournament.service');
jest.mock('@/database/services/match.service');
jest.mock('@/database/services/search.service');
jest.mock('@/database/services/auth.service');
jest.mock('@/database/services/club.service');

describe('Traffic Optimization Route Coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /api/tournaments/[code] uses lightweight summary path', async () => {
    const payload = { tournamentId: 'ABCD', tournamentPlayers: [] };
    (TournamentService.getTournamentSummaryForPublicPage as jest.Mock).mockResolvedValue(payload);

    const request = new NextRequest('http://localhost:3000/api/tournaments/ABCD', { method: 'GET' });
    const response = await getTournament(request, { params: Promise.resolve({ code: 'ABCD' }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toMatchObject(payload);
    expect(TournamentService.getTournamentSummaryForPublicPage).toHaveBeenCalledWith('ABCD');
  });

  it('GET /api/tournaments/[code]/knockout returns lightweight knockout payload', async () => {
    (TournamentService.getTournamentKnockoutView as jest.Mock).mockResolvedValue({
      knockout: [{ round: 1, matches: [] }],
      tournamentStatus: 'knockout',
    });

    const request = new NextRequest('http://localhost:3000/api/tournaments/ABCD/knockout', { method: 'GET' });
    const response = await getKnockout(request, { params: Promise.resolve({ code: 'ABCD' }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toMatchObject({
      success: true,
      knockout: [{ round: 1, matches: [] }],
      tournamentStatus: 'knockout',
    });
    expect(TournamentService.getTournamentKnockoutView).toHaveBeenCalledWith('ABCD');
  });

  it('GET /api/boards/[tournamentId]/[boardNumber]/matches reuses preloaded context', async () => {
    (TournamentService.getTournamentMatchContext as jest.Mock).mockResolvedValue({
      tournamentObjectId: '507f1f77bcf86cd799439011',
      clubId: '507f1f77bcf86cd799439012',
      startingScore: 501,
    });
    (MatchService.getBoardMatches as jest.Mock).mockResolvedValue([]);

    const request = new NextRequest('http://localhost:3000/api/boards/ABCD/1/matches', { method: 'GET' });
    const response = await getBoardMatches(request, {
      params: Promise.resolve({ tournamentId: 'ABCD', boardNumber: '1' }),
    });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toMatchObject({ matches: [] });
    expect(TournamentService.getTournamentMatchContext).toHaveBeenCalledWith('ABCD');
    expect(MatchService.getBoardMatches).toHaveBeenCalledWith(
      'ABCD',
      '507f1f77bcf86cd799439012',
      1,
      { tournamentObjectId: '507f1f77bcf86cd799439011', startingScore: 501 }
    );
  });

  it('POST /api/search supports optional counts/metadata flags', async () => {
    (SearchService.searchTournaments as jest.Mock).mockResolvedValue({ results: [{ id: 't1' }], total: 1 });
    (SearchService.getTabCounts as jest.Mock).mockResolvedValue({ tournaments: 1, players: 0, clubs: 0, leagues: 0, global: 1 });
    (SearchService.getMetadata as jest.Mock).mockResolvedValue({ cities: [] });

    const request = new Request('http://localhost:3000/api/search', {
      method: 'POST',
      body: JSON.stringify({
        query: 'alpha',
        tab: 'tournaments',
        filters: { page: 2, limit: 10 },
        includeCounts: false,
        includeMetadata: false,
      }),
    });
    const response = await searchRoute(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.results).toHaveLength(1);
    expect(json.counts).toBeUndefined();
    expect(json.metadata).toBeUndefined();
    expect(SearchService.getTabCounts).not.toHaveBeenCalled();
    expect(SearchService.getMetadata).not.toHaveBeenCalled();
  });

  it('GET /api/tournaments/[code]/getUserRole uses lightweight role context', async () => {
    (AuthService.verifyToken as jest.Mock).mockResolvedValue({ _id: 'user_1' });
    (TournamentService.getTournamentRoleContext as jest.Mock).mockResolvedValue({ clubId: 'club_1' });
    (ClubService.getUserRoleInClub as jest.Mock).mockResolvedValue('admin');
    (TournamentService.getPlayerStatusInTournament as jest.Mock).mockResolvedValue('checked-in');

    const request = new NextRequest('http://localhost:3000/api/tournaments/ABCD/getUserRole', {
      method: 'GET',
      headers: { cookie: 'token=valid_token' },
    });
    const response = await getUserRole(request, { params: Promise.resolve({ code: 'ABCD' }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toMatchObject({
      userClubRole: 'admin',
      userPlayerStatus: 'checked-in',
    });
    expect(TournamentService.getTournamentRoleContext).toHaveBeenCalledWith('ABCD');
    expect(ClubService.getUserRoleInClub).toHaveBeenCalledWith('user_1', 'club_1');
  });
});

