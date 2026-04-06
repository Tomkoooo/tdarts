import { z } from 'zod';
import { router } from '../init';
import { userProcedure, apiProcedure } from '../procedures';
import { mapServiceError } from '../errors/mapServiceError';
import { TournamentService } from '@tdarts/services';
import {
  createTournamentSchema,
  updateTournamentSchema,
  tournamentCodeSchema,
  joinTournamentSchema,
} from '@tdarts/schemas';

export const tournamentRouter = router({
  /**
   * Get full page data for a tournament by code (public view).
   * High-traffic: ~120 req/min at peak.
   */
  getPageData: apiProcedure
    .meta({ openapi: { method: 'GET', path: '/tournament/page-data', tags: ['tournament'], protect: true } })
    .input(tournamentCodeSchema)
    .query(async ({ input }) => {
      try {
        return await TournamentService.getTournamentSummaryForPublicPage(input.code);
      } catch (err) {
        throw mapServiceError(err);
      }
    }),

  /**
   * Get lightweight tournament overview (for listing / cards).
   */
  getLite: apiProcedure
    .meta({ openapi: { method: 'GET', path: '/tournament/lite', tags: ['tournament'], protect: true } })
    .input(tournamentCodeSchema)
    .query(async ({ input }) => {
      try {
        return await TournamentService.getTournamentLite(input.code);
      } catch (err) {
        throw mapServiceError(err);
      }
    }),

  /**
   * Create a new tournament. Requires authenticated user.
   */
  create: userProcedure
    .meta({ openapi: { method: 'POST', path: '/tournament/create', tags: ['tournament'], protect: true } })
    .input(createTournamentSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const userId = ctx.userId!;
        const tournament = await TournamentService.createTournament({
          ...input,
          startDate: new Date(input.startDate),
          endDate: input.endDate ? new Date(input.endDate) : undefined,
          createdBy: userId as any,
        } as any);
        return { tournamentId: String(tournament._id), code: (tournament as any).code };
      } catch (err) {
        throw mapServiceError(err);
      }
    }),

  /**
   * Update tournament metadata.
   */
  update: userProcedure
    .meta({ openapi: { method: 'PATCH', path: '/tournament/update', tags: ['tournament'], protect: true } })
    .input(z.object({ code: z.string(), data: updateTournamentSchema }))
    .mutation(async ({ input, ctx }) => {
      try {
        const updated = await TournamentService.updateTournamentSettings(
          input.code,
          ctx.userId!,
          input.data as any,
        );
        return { ok: true, tournamentId: String((updated as any)._id) };
      } catch (err) {
        throw mapServiceError(err);
      }
    }),

  /**
   * Join a tournament as the authenticated user.
   */
  join: userProcedure
    .meta({ openapi: { method: 'POST', path: '/tournament/join', tags: ['tournament'], protect: true } })
    .input(joinTournamentSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        await TournamentService.addTournamentPlayer(input.code, ctx.userId! as any);
        return { ok: true };
      } catch (err) {
        throw mapServiceError(err);
      }
    }),

  /**
   * Get the current user's role/status in a tournament.
   */
  getUserRole: userProcedure
    .meta({ openapi: { method: 'GET', path: '/tournament/user-role', tags: ['tournament'], protect: true } })
    .input(tournamentCodeSchema)
    .query(async ({ input, ctx }) => {
      try {
        const status = await TournamentService.getPlayerStatusInTournament(
          input.code,
          ctx.userId!,
        );
        return { status };
      } catch (err) {
        throw mapServiceError(err);
      }
    }),

  /**
   * Get the bracket/knockout view.
   */
  getBracket: apiProcedure
    .meta({ openapi: { method: 'GET', path: '/tournament/bracket', tags: ['tournament'], protect: true } })
    .input(tournamentCodeSchema)
    .query(async ({ input }) => {
      try {
        return await TournamentService.getTournamentBracketReadModel(input.code);
      } catch (err) {
        throw mapServiceError(err);
      }
    }),

  /**
   * Get tournament groups view.
   */
  getGroups: apiProcedure
    .meta({ openapi: { method: 'GET', path: '/tournament/groups', tags: ['tournament'], protect: true } })
    .input(tournamentCodeSchema)
    .query(async ({ input }) => {
      try {
        return await TournamentService.getTournamentGroupsReadModel(input.code);
      } catch (err) {
        throw mapServiceError(err);
      }
    }),
});
