/**
 * Traffic optimization tests - migrated to server actions.
 * API routes for tournaments, boards, search were removed in Next.js 16 migration.
 * This file tests the searchAction which replaced POST /api/search.
 */
import { searchAction } from '@/features/search/actions/search.action';
import { SearchService } from '@tdarts/services';

jest.mock('@tdarts/services', () => {
  const actual = jest.requireActual('@tdarts/services');
  return {
    ...actual,
    SearchService: {
      searchTournaments: jest.fn(),
      getTabCounts: jest.fn(),
      getMetadata: jest.fn(),
    },
  };
});

describe('Search Action (replaces POST /api/search)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('searchAction supports optional counts/metadata flags', async () => {
    (SearchService.searchTournaments as jest.Mock).mockResolvedValue({ results: [{ id: 't1' }], total: 1 });
    (SearchService.getTabCounts as jest.Mock).mockResolvedValue({ tournaments: 1, players: 0, clubs: 0, leagues: 0, global: 1 });
    (SearchService.getMetadata as jest.Mock).mockResolvedValue({ cities: [] });

    const result = await searchAction({
      query: 'alpha',
      tab: 'tournaments',
      filters: { page: 2, limit: 10 },
      includeCounts: false,
      includeMetadata: false,
    });

    expect(result.results).toHaveLength(1);
    expect(result.counts).toBeUndefined();
    expect(result.metadata).toBeUndefined();
    expect(SearchService.getTabCounts).not.toHaveBeenCalled();
    expect(SearchService.getMetadata).not.toHaveBeenCalled();
  });

  it('searchAction includes counts and metadata when requested', async () => {
    (SearchService.searchTournaments as jest.Mock).mockResolvedValue({ results: [{ id: 't1' }], total: 1 });
    (SearchService.getTabCounts as jest.Mock).mockResolvedValue({ tournaments: 1, players: 0, clubs: 0, leagues: 0, global: 1 });
    (SearchService.getMetadata as jest.Mock).mockResolvedValue({ cities: [{ city: 'Budapest', count: 5 }] });

    const result = await searchAction({
      query: 'alpha',
      tab: 'tournaments',
      filters: { page: 1, limit: 10 },
      includeCounts: true,
      includeMetadata: true,
    });

    expect(result.results).toHaveLength(1);
    expect(result.counts).toBeDefined();
    expect(result.counts?.tournaments).toBe(1);
    expect(result.metadata).toBeDefined();
    expect(result.metadata?.cities).toHaveLength(1);
    expect(SearchService.getTabCounts).toHaveBeenCalled();
    expect(SearchService.getMetadata).toHaveBeenCalled();
  });
});
