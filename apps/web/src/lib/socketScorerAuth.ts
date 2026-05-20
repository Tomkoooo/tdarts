/**
 * Scorer-side Socket.IO emit authorization (mirrors apps/socket/server.js).
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

export type SocketScorerAuthContext = {
  authType?: string;
  boardTournamentId?: string | null;
  userRole?: string;
};

export function eventTournamentCode(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const record = data as { tournamentCode?: string; tournamentId?: string };
  return record.tournamentCode || record.tournamentId || null;
}

export function canEmitScorerEvent(
  socket: SocketScorerAuthContext,
  data: unknown
): boolean {
  if (socket.authType === 'board') {
    const code = eventTournamentCode(data);
    if (!code || !socket.boardTournamentId) return false;
    return String(code) === String(socket.boardTournamentId);
  }
  const role = socket.userRole || 'guest';
  if (role === 'guest') return false;
  return true;
}

export function guardScorerEmit(
  socket: SocketScorerAuthContext,
  eventName: string,
  data: unknown
): boolean {
  if (!SCORER_SOCKET_EVENTS.has(eventName)) return true;
  return canEmitScorerEvent(socket, data);
}
