import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter, createTRPCContext } from '../root';

export const PUBLIC_BASE_PATH = '/trpc';

/**
 * Fetch-compatible handler for both standalone Hono and Next.js App Router.
 *
 * Usage (Next.js route):
 *   export { GET, POST } from '@tdarts/api/adapters/createFetchHandler';
 *
 * Usage (Hono):
 *   app.all('/trpc/*', (c) => handler(c.req.raw));
 */
export async function createHandler(req: Request): Promise<Response> {
  return fetchRequestHandler({
    endpoint: PUBLIC_BASE_PATH,
    req,
    router: appRouter,
    createContext: () => createTRPCContext({ req }),
    onError:
      process.env.NODE_ENV !== 'production'
        ? ({ path, error }) => {
            console.error(`[tRPC] /${path} threw:`, error);
          }
        : undefined,
    responseMeta({ errors }) {
      // Attach Retry-After when rate limited
      const rateLimited = errors.some((e) => e.code === 'TOO_MANY_REQUESTS');
      if (rateLimited) {
        return {
          headers: {
            'Retry-After': '60',
          },
        };
      }
      return {};
    },
  });
}
