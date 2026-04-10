import type { NextRequest } from 'next/server';
import { EVENTS, eventsBus } from '@/lib/events';
import { perfFlags } from '@/features/performance/lib/perfFlags';

const DEFAULT_MAX_MS = 96 * 60 * 60 * 1000; // 4 days, matches useRealTimeUpdates default
const ABSOLUTE_MAX_MS = DEFAULT_MAX_MS + 60 * 60 * 1000;
const MIN_MAX_MS = 60_000;

function clampMaxConnectionMs(raw: string | null): number {
  const n = parseInt(raw ?? '', 10);
  if (!Number.isFinite(n) || n < MIN_MAX_MS) return DEFAULT_MAX_MS;
  return Math.min(n, ABSOLUTE_MAX_MS);
}

/**
 * Server-Sent Events for tournament realtime (same process as publishers via eventsBus).
 */
export function createSseUpdatesResponse(request: NextRequest): Response {
  const url = new URL(request.url);
  const tournamentId = url.searchParams.get('tournamentId')?.trim() || undefined;

  if (perfFlags.realtimeRequireScopedSse && !tournamentId) {
    return new Response(JSON.stringify({ error: 'tournamentId required for SSE' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const maxConnectionMs = clampMaxConnectionMs(url.searchParams.get('maxConnectionMs'));
  const encoder = new TextEncoder();
  let closed = false;

  let cleanup: (() => void) | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (eventName: string, data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(
            encoder.encode(`event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        } catch {
          cleanup?.();
        }
      };

      const subscribeOpts = tournamentId
        ? { tournamentId, includeGlobal: true as const }
        : { includeGlobal: true as const };

      const unsubs = [
        eventsBus.subscribe(EVENTS.TOURNAMENT_UPDATE, (p) => send('tournament-update', p), subscribeOpts),
        eventsBus.subscribe(EVENTS.MATCH_UPDATE, (p) => send('match-update', p), subscribeOpts),
        eventsBus.subscribe(EVENTS.GROUP_UPDATE, (p) => send('group-update', p), subscribeOpts),
      ];

      send('message', { message: 'SSE Connected' });

      const heartbeat = setInterval(() => {
        send('heartbeat', { time: Date.now() });
      }, 25_000);

      const maxAgeTimer = setTimeout(() => {
        send('message', { reason: 'max-connection-age-reached' });
        cleanup?.();
      }, maxConnectionMs);

      cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        clearTimeout(maxAgeTimer);
        unsubs.forEach((u) => u());
        try {
          controller.close();
        } catch {
          /* ignore */
        }
      };

      request.signal.addEventListener('abort', () => cleanup?.());
    },
    cancel() {
      cleanup?.();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

export function requestWantsSse(request: NextRequest): boolean {
  const accept = request.headers.get('accept') ?? '';
  if (accept.includes('text/event-stream')) return true;
  const url = new URL(request.url);
  return url.searchParams.has('maxConnectionMs') || url.searchParams.has('tournamentId');
}
