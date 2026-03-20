import { EventEmitter } from 'events';

// Use a global singleton to ensure we share the same emitter instance across API routes
// in a long-running Node.js process (like `next start`).
// Note: This works for single-instance deployments. For serverless/multi-instance, 
// you would need an external Pub/Sub (like Redis).

declare global {
  var tournamentEventEmitter: EventEmitter | undefined;
}

export const eventEmitter = global.tournamentEventEmitter || new EventEmitter();

const maxListenersFromEnv = Number(process.env.SSE_EVENT_EMITTER_MAX_LISTENERS ?? '200');
if (Number.isFinite(maxListenersFromEnv) && maxListenersFromEnv > 0) {
  // SSE fan-out attaches one listener per client connection by design.
  eventEmitter.setMaxListeners(maxListenersFromEnv);
}

if (process.env.NODE_ENV !== 'production') {
  global.tournamentEventEmitter = eventEmitter;
}

export const EVENTS = {
  TOURNAMENT_UPDATE: 'tournament-update',
  MATCH_UPDATE: 'match-update',
  GROUP_UPDATE: 'group-update',
};

export type SseDeltaScope = 'tournament' | 'board' | 'match' | 'group' | 'ranking';
export type SseDeltaAction =
  | 'created'
  | 'updated'
  | 'started'
  | 'finished'
  | 'leg-finished'
  | 'standings-updated'
  | 'knockout-updated'
  | 'resync-required';

export type SseDeltaPayload<TData = Record<string, unknown>> = {
  schemaVersion: 1;
  kind: 'delta';
  tournamentId: string;
  scope: SseDeltaScope;
  action: SseDeltaAction;
  data: TData;
  requiresResync?: boolean;
  emittedAt: string;
};

export function createSseDeltaPayload<TData = Record<string, unknown>>(input: {
  tournamentId: string;
  scope: SseDeltaScope;
  action: SseDeltaAction;
  data: TData;
  requiresResync?: boolean;
}): SseDeltaPayload<TData> {
  return {
    schemaVersion: 1,
    kind: 'delta',
    tournamentId: input.tournamentId,
    scope: input.scope,
    action: input.action,
    data: input.data,
    requiresResync: input.requiresResync ?? false,
    emittedAt: new Date().toISOString(),
  };
}
