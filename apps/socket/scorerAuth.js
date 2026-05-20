/**
 * Scorer-side Socket.IO emit authorization (keep in sync with apps/web/src/lib/socketScorerAuth.ts).
 */

export const SCORER_SOCKET_EVENTS = new Set([
  'init-match',
  'set-match-players',
  'throw',
  'undo-throw',
  'leg-complete',
  'match-complete',
  'match-started',
]);

export function eventTournamentCode(data) {
  if (!data || typeof data !== 'object') return null;
  return data.tournamentCode || data.tournamentId || null;
}

export function canEmitScorerEvent(socket, data) {
  if (socket.authType === 'board') {
    const code = eventTournamentCode(data);
    if (!code || !socket.boardTournamentId) return false;
    return String(code) === String(socket.boardTournamentId);
  }
  const role = socket.userRole || 'guest';
  if (role === 'guest') return false;
  return true;
}

export function guardScorerEmit(socket, eventName, data) {
  if (!SCORER_SOCKET_EVENTS.has(eventName)) return true;
  if (canEmitScorerEvent(socket, data)) return true;
  console.log(`❌ Blocked ${eventName} from ${socket.userId} (${socket.authType})`);
  return false;
}
