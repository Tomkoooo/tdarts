import { router } from '../init';
import { apiProcedure } from '../procedures';
import { mapServiceError } from '../errors/mapServiceError';
import { SearchService } from '@tdarts/services';
import { searchQuerySchema } from '@tdarts/schemas';

export const searchRouter = router({
  /**
   * Global search across tournaments, clubs, players, and leagues.
   * Responses are NOT cached in the API layer — Redis-level caching lives in SearchService.
   * The Next.js `unstable_cache` wrapper stays web-only.
   */
  global: apiProcedure
    .meta({ openapi: { method: 'GET', path: '/search/global', tags: ['search'], protect: true } })
    .input(searchQuerySchema)
    .query(async ({ input }) => {
      try {
        const { q, tab, locale, page, limit } = input;
        const filters = { locale, page, limit };

        if (tab && tab !== 'all') {
          switch (tab) {
            case 'tournaments':
              return { tab, ...(await SearchService.searchTournaments(q, filters as any)) };
            case 'clubs':
              return { tab, ...(await SearchService.searchClubs(q, filters as any)) };
            case 'players':
              return { tab, ...(await SearchService.searchPlayers(q, filters as any)) };
            case 'leagues':
              return { tab, ...(await SearchService.searchLeagues(q, filters as any)) };
          }
        }

        // "all" — run tab counts + top results for each category
        const [tabCounts, tournaments, clubs, players, leagues] = await Promise.allSettled([
          SearchService.getTabCounts(q, filters as any),
          SearchService.searchTournaments(q, { ...filters, limit: 5 } as any),
          SearchService.searchClubs(q, { ...filters, limit: 5 } as any),
          SearchService.searchPlayers(q, { ...filters, limit: 5 } as any),
          SearchService.searchLeagues(q, { ...filters, limit: 5 } as any),
        ]);

        return {
          tab: 'all',
          counts: tabCounts.status === 'fulfilled' ? tabCounts.value : null,
          tournaments: tournaments.status === 'fulfilled' ? tournaments.value : null,
          clubs: clubs.status === 'fulfilled' ? clubs.value : null,
          players: players.status === 'fulfilled' ? players.value : null,
          leagues: leagues.status === 'fulfilled' ? leagues.value : null,
        };
      } catch (err) {
        throw mapServiceError(err);
      }
    }),

  /**
   * Get metadata for search filters (cities, etc.).
   */
  metadata: apiProcedure
    .meta({ openapi: { method: 'GET', path: '/search/metadata', tags: ['search'], protect: true } })
    .input(searchQuerySchema.pick({ q: true }).partial())
    .query(async ({ input }) => {
      try {
        return await SearchService.getMetadata(input.q);
      } catch (err) {
        throw mapServiceError(err);
      }
    }),
});
