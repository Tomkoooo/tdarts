'use server';

import { unstable_cache } from 'next/cache';
import { SearchService } from '@/database/services/search.service';
import { withTelemetry } from '@/shared/lib/withTelemetry';
import { getUserTimeZone } from '@/lib/date-time';
import { serializeForClient } from '@/shared/lib/serializeForClient';
import { perfFlags } from '@/features/performance/lib/perfFlags';
import type { SearchActionInput, SearchActionResult } from '@/features/search/lib/searchActionTypes';
import { applyTournamentStartDateForSearch, getSearchActionCacheKey } from '@/features/search/lib/searchActionHelpers';

export type { SearchActionInput, SearchActionResult } from '@/features/search/lib/searchActionTypes';

async function executeSearch(params: SearchActionInput) {
  const { query, tab, filters, includeCounts = false, includeMetadata = false } = params;
  const timeZone = filters.timeZone || getUserTimeZone();
  const searchFilters = applyTournamentStartDateForSearch({
    ...filters,
    timeZone,
    page: filters.page || 1,
    limit: filters.limit || 10,
  });

  const isFirstPage = (searchFilters.page || 1) === 1;

  let results: any[] = [];
  let total = 0;
  let counts: SearchActionResult['counts'];
  let groupedResults: SearchActionResult['groupedResults'];

  const countsPromise =
    isFirstPage && includeCounts && !(tab === 'global' && perfFlags.searchFanoutV2)
      ? SearchService.getTabCounts(query, searchFilters)
      : Promise.resolve(undefined);
  const metadataPromise =
    isFirstPage && includeMetadata
      ? SearchService.getMetadata(query, searchFilters)
      : Promise.resolve(undefined);

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
    if (includeCounts && perfFlags.searchFanoutV2) {
      counts = globalRes.countsByType;
    }
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

  const [resolvedCounts, resolvedMetadata] = await Promise.all([
    countsPromise,
    metadataPromise,
  ]);
  counts = counts || resolvedCounts;
  const metadata = resolvedMetadata;

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
}

export async function searchAction(input: SearchActionInput): Promise<SearchActionResult> {
  const run = withTelemetry(
    'search.search',
    async (params: SearchActionInput) => {
      const page = Number(params.filters.page || 1);
      // Avoid stale pagination merges under rapid tab/filter changes.
      const data =
        page > 1
          ? await executeSearch(params)
          : await unstable_cache(
              () => executeSearch(params),
              getSearchActionCacheKey(params),
              { tags: ['search'], revalidate: 60 }
            )();
      return serializeForClient(data) as SearchActionResult;
    },
    { method: 'ACTION', metadata: { feature: 'search', actionName: 'search' } }
  );

  return run(input);
}
