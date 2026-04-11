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
} as const;

type EventName = (typeof EVENTS)[keyof typeof EVENTS];
type EventListener<TPayload = unknown> = (payload: TPayload) => void;
type SubscribeOptions = {
  tournamentId?: string;
  includeGlobal?: boolean;
};

const GLOBAL_CHANNEL = 'global';
const BUS_IMPLEMENTATION = process.env.FF_EVENTS_BUS_IMPLEMENTATION ?? 'inproc';

function resolveChannel(payload: unknown): string {
  if (
    typeof payload === 'object' &&
    payload !== null &&
    'tournamentId' in payload &&
    typeof (payload as { tournamentId?: unknown }).tournamentId === 'string' &&
    (payload as { tournamentId: string }).tournamentId.trim().length > 0
  ) {
    return (payload as { tournamentId: string }).tournamentId;
  }
  return GLOBAL_CHANNEL;
}

function scopedEventName(eventName: EventName, channel: string): string {
  return `${eventName}::${channel}`;
}

function withLegacyCompatibility(eventName: EventName, payload: unknown) {
  eventEmitter.emit(eventName, payload);
}

function subscribeScoped<TPayload>(
  eventName: EventName,
  listener: EventListener<TPayload>,
  options?: SubscribeOptions,
): () => void {
  const scopedTournamentId = options?.tournamentId?.trim() || '';
  const channels = new Set<string>([scopedTournamentId || GLOBAL_CHANNEL]);
  if (options?.includeGlobal && scopedTournamentId) {
    channels.add(GLOBAL_CHANNEL);
  }

  for (const channel of channels) {
    eventEmitter.on(scopedEventName(eventName, channel), listener as EventListener);
  }
  const useLegacyGlobal = !scopedTournamentId && options?.includeGlobal;
  if (useLegacyGlobal) {
    eventEmitter.on(eventName, listener as EventListener);
  }

  return () => {
    for (const channel of channels) {
      eventEmitter.off(scopedEventName(eventName, channel), listener as EventListener);
    }
    if (useLegacyGlobal) {
      eventEmitter.off(eventName, listener as EventListener);
    }
  };
}

function listenerCountScoped(eventName: EventName, options?: SubscribeOptions): number {
  const primaryChannel = options?.tournamentId?.trim() || GLOBAL_CHANNEL;
  let count = eventEmitter.listenerCount(scopedEventName(eventName, primaryChannel));
  if (options?.includeGlobal && primaryChannel !== GLOBAL_CHANNEL) {
    count += eventEmitter.listenerCount(scopedEventName(eventName, GLOBAL_CHANNEL));
  }
  if (!options?.tournamentId && options?.includeGlobal) {
    count += eventEmitter.listenerCount(eventName);
  }
  return count;
}

export const eventsBus = {
  implementation: BUS_IMPLEMENTATION,
  publish<TPayload>(eventName: EventName, payload: TPayload) {
    const channel = resolveChannel(payload);
    eventEmitter.emit(scopedEventName(eventName, channel), payload);
    withLegacyCompatibility(eventName, payload);
  },
  subscribe<TPayload>(
    eventName: EventName,
    listener: EventListener<TPayload>,
    options?: SubscribeOptions,
  ) {
    return subscribeScoped(eventName, listener, options);
  },
  listenerCount(eventName: EventName, options?: SubscribeOptions) {
    return listenerCountScoped(eventName, options);
  },
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

/** Client refetches these read-model sections (see getTournamentReadModelForSection). */
export type SseSectionHint = 'boards' | 'groups' | 'bracket' | 'boards+groups' | 'boards+bracket';

/** Inline board row update so UIs can skip a fetch for simple status transitions. */
export type SseBoardPatch = {
  boardNumber: number;
  status: 'playing' | 'waiting' | 'idle';
  currentMatch?: unknown;
  nextMatch?: unknown;
};

export type SseDeltaPayload<TData = Record<string, unknown>> = {
  schemaVersion: 1;
  kind: 'delta';
  tournamentId: string;
  scope: SseDeltaScope;
  action: SseDeltaAction;
  eventId?: string;
  channel?: string;
  data: TData;
  requiresResync?: boolean;
  /** When set, clients should merge that section from the server instead of guessing. */
  sectionHint?: SseSectionHint;
  /** Optional snapshot for boards tab / kiosk without an extra round-trip. */
  boardPatch?: SseBoardPatch;
  emittedAt: string;
};

export function createSseDeltaPayload<TData = Record<string, unknown>>(input: {
  tournamentId: string;
  scope: SseDeltaScope;
  action: SseDeltaAction;
  data: TData;
  requiresResync?: boolean;
  sectionHint?: SseSectionHint;
  boardPatch?: SseBoardPatch;
}): SseDeltaPayload<TData> {
  return {
    schemaVersion: 1,
    kind: 'delta',
    tournamentId: input.tournamentId,
    scope: input.scope,
    action: input.action,
    eventId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    channel: input.tournamentId,
    data: input.data,
    requiresResync: input.requiresResync ?? false,
    sectionHint: input.sectionHint,
    boardPatch: input.boardPatch,
    emittedAt: new Date().toISOString(),
  };
}
