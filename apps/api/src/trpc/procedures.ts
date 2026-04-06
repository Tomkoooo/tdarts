import { publicProcedure } from './init';
import { requireKnownCaller } from './middleware/requireKnownCaller';
import { requireUserJwt } from './middleware/requireUserJwt';
import { TRPCError } from '@trpc/server';

/**
 * apiProcedure — Tier 1 only.
 * Use for public-ish endpoints like auth.login / auth.register that don't need a user JWT.
 */
export const apiProcedure = publicProcedure.use(requireKnownCaller);

/**
 * userProcedure — Tier 1 + Tier 2.
 * Use for all user-scoped operations (reads/writes on behalf of a logged-in user).
 */
export const userProcedure = apiProcedure.use(requireUserJwt);

/**
 * integrationProcedure — Tier 1, integration kind only.
 * Use for partner webhooks, bulk reads, or M2M operations.
 */
export const integrationProcedure = apiProcedure.use(({ ctx, next }) => {
  if (!ctx.caller || ctx.caller.kind !== 'integration') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'This endpoint is restricted to integration callers',
    });
  }
  return next();
});
