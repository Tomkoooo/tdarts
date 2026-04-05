import { router } from './init';
import { withTrpcTelemetry } from './telemetry/withTrpcTelemetry';
import { authRouter } from './routers/auth.router';
import { tournamentRouter } from './routers/tournament.router';
import { clubRouter } from './routers/club.router';
import { searchRouter } from './routers/search.router';

export const appRouter = router({
  auth: authRouter,
  tournament: tournamentRouter,
  club: clubRouter,
  search: searchRouter,
});

export type AppRouter = typeof appRouter;

/** Fetch handler factory for Hono / Next.js adapters. */
export { createTRPCContext } from './init';
