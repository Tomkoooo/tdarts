/**
 * Unit tests for search router — SearchService is mocked.
 */
import { createCallerFactory } from '../trpc/init';
import { appRouter, createTRPCContext } from '../trpc/root';
import { SearchService } from '@tdarts/services';

jest.mock('@tdarts/services', () => ({
  SearchService: {
    getTabCounts: jest.fn(),
    searchTournaments: jest.fn(),
    searchClubs: jest.fn(),
    searchPlayers: jest.fn(),
    searchLeagues: jest.fn(),
    getMetadata: jest.fn(),
  },
  AuthService: { verifyToken: jest.fn() },
  ClubService: {},
  TournamentService: {},
}));

const mockSearchService = SearchService as jest.Mocked<typeof SearchService>;

function makeCtx() {
  return createTRPCContext({
    req: new Request('http://localhost/trpc/search.global', {
      method: 'GET',
      headers: new Headers({ 'x-client-id': 'test-client-id', 'x-client-secret': 'test-client-secret' }),
    }),
  });
}

const createCaller = createCallerFactory(appRouter);

describe('search.global', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns all-tab combined results', async () => {
    mockSearchService.getTabCounts.mockResolvedValue({ global: 11, tournaments: 3, clubs: 1, players: 5, leagues: 2 });
    mockSearchService.searchTournaments.mockResolvedValue({ results: [], total: 3 });
    mockSearchService.searchClubs.mockResolvedValue({ results: [], total: 1 });
    mockSearchService.searchPlayers.mockResolvedValue({ results: [], total: 5 });
    mockSearchService.searchLeagues.mockResolvedValue({ results: [], total: 2 });

    const ctx = await makeCtx();
    const caller = createCaller(ctx);
    const result = await caller.search.global({ q: 'dart' });

    expect(result.tab).toBe('all');
    expect(result.counts).toMatchObject({ tournaments: 3 });
  });

  it('returns filtered results when tab is specified', async () => {
    mockSearchService.searchTournaments.mockResolvedValue({ results: [{ id: '1', name: 'Dart Open' }], total: 1 });

    const ctx = await makeCtx();
    const caller = createCaller(ctx);
    const result = await caller.search.global({ q: 'dart', tab: 'tournaments' });

    expect(result.tab).toBe('tournaments');
    expect(mockSearchService.searchTournaments).toHaveBeenCalledWith('dart', expect.any(Object));
    expect(mockSearchService.searchClubs).not.toHaveBeenCalled();
  });

  it('rejects empty query (Zod)', async () => {
    const ctx = await makeCtx();
    const caller = createCaller(ctx);
    await expect(caller.search.global({ q: '' })).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  it('rejects without Tier 1 credentials', async () => {
    const ctx = await createTRPCContext({
      req: new Request('http://localhost/trpc/search.global', { method: 'GET', headers: new Headers() }),
    });
    const caller = createCaller(ctx);
    await expect(caller.search.global({ q: 'dart' })).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });
});

describe('search.metadata', () => {
  it('returns metadata', async () => {
    mockSearchService.getMetadata.mockResolvedValue({ cities: [{ city: 'Budapest', count: 10 }] });

    const ctx = await makeCtx();
    const caller = createCaller(ctx);
    const result = await caller.search.metadata({ q: 'dart' });

    expect(result.cities).toHaveLength(1);
    expect(result.cities[0].city).toBe('Budapest');
  });
});
