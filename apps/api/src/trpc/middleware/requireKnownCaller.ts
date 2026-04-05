import { TRPCError } from '@trpc/server';
import { resolveCaller } from '../../auth/resolveCaller';
import { middleware } from '../init';

/**
 * Tier 1 — Caller authentication.
 *
 * Every request to apps/api must carry caller credentials BEFORE any
 * user-scoped verification. Two caller families are supported:
 *
 *   mobile_app   – X-Client-Id + X-Client-Secret (per mobile build / env)
 *   integration  – X-Integration-Key  (per approved 3rd-party)
 *
 * Env vars:
 *   API_MOBILE_CLIENT_ID      – expected mobile client ID
 *   API_MOBILE_CLIENT_SECRET  – expected mobile client secret
 *   API_INTEGRATION_KEYS      – comma-separated list of valid integration keys
 *
 * Logic is shared with REST handlers via resolveCaller().
 */
export const requireKnownCaller = middleware(({ ctx, next }) => {
  const caller = resolveCaller(ctx.req.headers);

  if (!caller) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Missing or invalid caller credentials',
    });
  }

  return next({ ctx: { ...ctx, caller } });
});
