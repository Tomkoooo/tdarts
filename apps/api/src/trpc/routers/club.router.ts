import { z } from 'zod';
import { router } from '../init';
import { userProcedure, apiProcedure } from '../procedures';
import { mapServiceError } from '../errors/mapServiceError';
import { ClubService } from '@tdarts/services';
import { createClubSchema, updateClubSchema } from '@tdarts/schemas';

export const clubRouter = router({
  /**
   * Get full club data by ID.
   */
  getById: apiProcedure
    .meta({ openapi: { method: 'GET', path: '/club/get', tags: ['club'], protect: true } })
    .input(z.object({ clubId: z.string() }))
    .query(async ({ input }) => {
      try {
        return await ClubService.getClub(input.clubId);
      } catch (err) {
        throw mapServiceError(err);
      }
    }),

  /**
   * Get lightweight club summary (for cards / lists).
   */
  getSummary: apiProcedure
    .meta({ openapi: { method: 'GET', path: '/club/summary', tags: ['club'], protect: true } })
    .input(z.object({ clubId: z.string() }))
    .query(async ({ input, ctx }) => {
      try {
        return await ClubService.getClubSummary(input.clubId, ctx.requestId);
      } catch (err) {
        throw mapServiceError(err);
      }
    }),

  /**
   * Get all clubs the authenticated user is a member of.
   */
  getMyClubs: userProcedure
    .meta({ openapi: { method: 'GET', path: '/club/my-clubs', tags: ['club'], protect: true } })
    .input(z.void())
    .query(async ({ ctx }) => {
      try {
        return await ClubService.getUserClubs(ctx.userId!);
      } catch (err) {
        throw mapServiceError(err);
      }
    }),

  /**
   * Create a new club. Authenticated user becomes the owner.
   */
  create: userProcedure
    .meta({ openapi: { method: 'POST', path: '/club/create', tags: ['club'], protect: true } })
    .input(createClubSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const club = await ClubService.createClub(
          ctx.userId!,
          {
            name: input.name,
            description: input.description ?? '',
            location: input.location,
            contact: {
              email: input.email || undefined,
              phone: typeof input.phone === 'string' && input.phone ? input.phone : undefined,
              website: typeof input.website === 'string' && input.website ? input.website : undefined,
            },
          },
        );
        return { clubId: String(club._id), name: (club as any).name };
      } catch (err) {
        throw mapServiceError(err);
      }
    }),

  /**
   * Update club details. User must be an admin or owner of the club.
   */
  update: userProcedure
    .meta({ openapi: { method: 'PATCH', path: '/club/update', tags: ['club'], protect: true } })
    .input(z.object({ clubId: z.string(), data: updateClubSchema }))
    .mutation(async ({ input, ctx }) => {
      try {
        const updated = await ClubService.updateClub(
          input.clubId,
          ctx.userId!,
          input.data as any,
        );
        return { ok: true, clubId: String((updated as any)._id) };
      } catch (err) {
        throw mapServiceError(err);
      }
    }),

  /**
   * Add the authenticated user as a member of a club.
   */
  join: userProcedure
    .meta({ openapi: { method: 'POST', path: '/club/join', tags: ['club'], protect: true } })
    .input(z.object({ clubId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      try {
        await ClubService.addMember(input.clubId, ctx.userId!, ctx.userId!);
        return { ok: true };
      } catch (err) {
        throw mapServiceError(err);
      }
    }),

  /**
   * Remove a member from a club. Requester must have mod/admin rights.
   */
  removeMember: userProcedure
    .meta({ openapi: { method: 'POST', path: '/club/remove-member', tags: ['club'], protect: true } })
    .input(z.object({ clubId: z.string(), userId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      try {
        await ClubService.removeMember(input.clubId, input.userId, ctx.userId!);
        return { ok: true };
      } catch (err) {
        throw mapServiceError(err);
      }
    }),

  /**
   * Get members for management view. Requires mod/admin rights.
   */
  getMembers: userProcedure
    .meta({ openapi: { method: 'GET', path: '/club/members', tags: ['club'], protect: true } })
    .input(z.object({ clubId: z.string() }))
    .query(async ({ input, ctx }) => {
      try {
        return await ClubService.getClubMembersForManagement(input.clubId, ctx.requestId);
      } catch (err) {
        throw mapServiceError(err);
      }
    }),
});
