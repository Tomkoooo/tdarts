'use server';

import { SearchService } from '@/database/services/search.service';
import type { SearchFilters } from '@/database/services/search.service';
import { withTelemetry } from '@/shared/lib/withTelemetry';
import { getUserTimeZone } from '@/lib/date-time';

export type SearchActionInput = {
  query: string;
  tab: string;
  filters: SearchFilters & { page?: number; timeZone?: string };
  includeCounts?: boolean;
  includeMetadata?: boolean;
};

export type SearchActionResult = {
  results: any[];
  counts?: { global: number; tournaments: number; players: number; clubs: number; leagues: number };
  groupedResults?: { tournaments: any[]; players: any[]; clubs: any[]; leagues: any[] };
  metadata?: { cities: { city: string; count: number }[] };
  pagination?: { total: number; page: number; limit: number; totalPages?: number };
};

export async function searchAction(input: SearchActionInput): Promise<SearchActionResult> {
  const run = withTelemetry(
    'search.search',
    async (params: SearchActionInput) => {
      const { query, tab, filters, includeCounts = false, includeMetadata = false } = params;
      const timeZone = filters.timeZone || getUserTimeZone();
      const searchFilters: SearchFilters = {
        ...filters,
        timeZone,
        page: filters.page || 1,
        limit: filters.limit || 10,
      };

      const isFirstPage = (searchFilters.page || 1) === 1;

      let results: any[] = [];
      let total = 0;
      let counts: SearchActionResult['counts'];
      let metadata: SearchActionResult['metadata'];
      let groupedResults: SearchActionResult['groupedResults'];

      if (tab === 'global') {
        const globalRes = await SearchService.searchGlobal(query, searchFilters);
        results = [
          ...globalRes.results.tournaments.map((t: any) => ({ ...t, _resultType: 'tournament' })),
          ...globalRes.results.players.map((p: any) => ({ ...p, _resultType: 'player' })),
          ...globalRes.results.clubs.map((c: any) => ({ ...c, _resultType: 'club' })),
          ...globalRes.results.leagues.map((l: any) => ({ ...l, _resultType: 'league' })),
        ];
        total = globalRes.total;
        groupedResults = globalRes.results;
      } else if (tab === 'tournaments') {
        const tRes = await SearchService.searchTournaments(query, searchFilters);
        results = tRes.results.map((r: any) => ({ ...r, _resultType: 'tournament' }));
        total = tRes.total;
      } else if (tab === 'players') {
        const pRes = await SearchService.searchPlayers(query, searchFilters);
        results = pRes.results.map((r: any) => ({ ...r, _resultType: 'player' }));
        total = pRes.total;
      } else if (tab === 'clubs') {
        const cRes = await SearchService.searchClubs(query, searchFilters);
        results = cRes.results.map((r: any) => ({ ...r, _resultType: 'club' }));
        total = cRes.total;
      } else if (tab === 'leagues') {
        const lRes = await SearchService.searchLeagues(query, searchFilters);
        results = lRes.results.map((r: any) => ({ ...r, _resultType: 'league' }));
        total = lRes.total;
      } else {
        const tRes = await SearchService.searchTournaments(query, searchFilters);
        results = tRes.results.map((r: any) => ({ ...r, _resultType: 'tournament' }));
        total = tRes.total;
      }

      if (isFirstPage && includeCounts) {
        counts = await SearchService.getTabCounts(query, searchFilters);
      }

      if (isFirstPage && includeMetadata) {
        const meta = await SearchService.getMetadata(query, searchFilters);
        metadata = meta;
      }

      const page = searchFilters.page || 1;
      const limit = searchFilters.limit || 10;
      const totalPages = Math.ceil(total / limit);

      return {
        results,
        counts,
        groupedResults,
        metadata,
        pagination: { total, page, limit, totalPages },
      };
    },
    { method: 'ACTION', metadata: { feature: 'search', actionName: 'search' } }
  );

  return run(input);
}
