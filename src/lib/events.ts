import { EventEmitter } from 'events';

// Use a global singleton to ensure we share the same emitter instance across API routes
// in a long-running Node.js process (like `next start`).
// Note: This works for single-instance deployments. For serverless/multi-instance, 
// you would need an external Pub/Sub (like Redis).

declare global {
  var tournamentEventEmitter: EventEmitter | undefined;
}

export const eventEmitter = global.tournamentEventEmitter || new EventEmitter();

if (process.env.NODE_ENV !== 'production') {
  global.tournamentEventEmitter = eventEmitter;
}

export const EVENTS = {
  TOURNAMENT_UPDATE: 'tournament-update',
  MATCH_UPDATE: 'match-update',
  GROUP_UPDATE: 'group-update',
};
