import { TRPCError } from '@trpc/server';
import { middleware } from '../init';

/** In-memory rate limit store for dev/non-Redis environments. */
const inMemoryStore = new Map<string, { count: number; resetAt: number }>();

function inMemoryRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = inMemoryStore.get(key);

  if (!entry || entry.resetAt < now) {
    inMemoryStore.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}

export interface RateLimitOptions {
  /** Max requests per window */
  limit?: number;
  /** Window in milliseconds */
  windowMs?: number;
}

const DEFAULT_LIMIT = 120;
const DEFAULT_WINDOW_MS = 60_000;

/**
 * Rate limit middleware factory.
 *
 * Keys:
 *   - Tier 1: caller.clientId (always)
 *   - Tier 2: userId (when present)
 *   - Per-path bucket as backstop
 *
 * Uses Upstash Redis when UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
 * are set, otherwise falls back to a simple in-memory store (dev only).
 */
export function createRateLimitMiddleware(path: string, opts: RateLimitOptions = {}) {
  const limit = opts.limit ?? DEFAULT_LIMIT;
  const windowMs = opts.windowMs ?? DEFAULT_WINDOW_MS;

  return middleware(async ({ ctx, next }) => {
    const callerId = ctx.caller?.clientId ?? 'unknown';
    const userId = ctx.userId ?? null;

    // Build keys to check
    const keys = [
      `rl:caller:${callerId}:${path}`,
      `rl:path:${path}`,
    ];
    if (userId) keys.push(`rl:user:${userId}:${path}`);

    const useUpstash =
      process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN;

    if (useUpstash) {
      try {
        // Lazy import to avoid hard dep when Upstash not configured
        const { Ratelimit } = await import('@upstash/ratelimit');
        const { Redis } = await import('@upstash/redis');

        const redis = Redis.fromEnv();
        const ratelimit = new Ratelimit({
          redis,
          limiter: Ratelimit.slidingWindow(limit, `${windowMs}ms` as any),
          prefix: 'tdarts_api',
        });

        for (const key of keys) {
          const { success, reset } = await ratelimit.limit(key);
          if (!success) {
            throw new TRPCError({
              code: 'TOO_MANY_REQUESTS',
              message: `Rate limit exceeded. Retry after ${Math.ceil((reset - Date.now()) / 1000)}s`,
            });
          }
        }
      } catch (err) {
        if (err instanceof TRPCError) throw err;
        // If Redis is down, fall through (fail open)
        console.error('[rateLimit] Upstash error, failing open:', err);
      }
    } else {
      // In-memory fallback (dev / single instance only)
      for (const key of keys) {
        if (!inMemoryRateLimit(key, limit, windowMs)) {
          throw new TRPCError({
            code: 'TOO_MANY_REQUESTS',
            message: 'Rate limit exceeded',
          });
        }
      }
    }

    return next();
  });
}
