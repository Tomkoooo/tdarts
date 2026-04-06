import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import type { Caller, CallerKind } from '../auth/callerTypes';
import { extractErrorCode } from './errors/mapServiceError';

export type { Caller, CallerKind };

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

export interface TRPCContext {
  /** Tier 1 — set after requireKnownCaller passes */
  caller: Caller | null;
  /** Tier 2 — set after requireUserJwt passes; null for unauthenticated procedures */
  userId: string | null;
  /** Correlation ID forwarded from X-Request-Id */
  requestId: string;
  /** Raw request (for middleware access to headers) */
  req: Request;
}

export async function createTRPCContext(opts: { req: Request }): Promise<TRPCContext> {
  const requestId =
    opts.req.headers.get('x-request-id') ||
    `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  return {
    caller: null,
    userId: null,
    requestId,
    req: opts.req,
  };
}

// ---------------------------------------------------------------------------
// tRPC init
// ---------------------------------------------------------------------------

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        errorCode: extractErrorCode(error as TRPCError),
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const middleware = t.middleware;
export const mergeRouters = t.mergeRouters;
export const createCallerFactory = t.createCallerFactory;
