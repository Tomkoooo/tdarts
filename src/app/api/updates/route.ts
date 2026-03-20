import { NextRequest, NextResponse } from 'next/server';
import { eventEmitter, EVENTS, createSseDeltaPayload } from '@/lib/events';
import { withApiTelemetry } from '@/lib/api-telemetry';
import { assertEligibilityResult } from '@/shared/lib/guards';
import { findTournamentByCode } from '@/features/tournaments/lib/liveLayout.db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// Helper to format SSE message
const formatMessage = (event: string, data: any) => {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
};

const DEFAULT_MAX_CONNECTION_MS = 96 * 60 * 60 * 1000; // 4 days
const MIN_MAX_CONNECTION_MS = 60 * 1000; // 1 minute
const MAX_MAX_CONNECTION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const HEARTBEAT_MS = 20_000;
const SSE_DEBUG = process.env.SSE_DEBUG === 'true';
const SSE_MEMORY_DEBUG = process.env.SSE_MEMORY_DEBUG === 'true';

function clampMaxConnectionMs(value: string | null): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_MAX_CONNECTION_MS;
  return Math.min(Math.max(parsed, MIN_MAX_CONNECTION_MS), MAX_MAX_CONNECTION_MS);
}

function listenerCounts() {
  return {
    tournament: eventEmitter.listenerCount(EVENTS.TOURNAMENT_UPDATE),
    match: eventEmitter.listenerCount(EVENTS.MATCH_UPDATE),
    group: eventEmitter.listenerCount(EVENTS.GROUP_UPDATE),
  };
}

function debugLog(connectionId: string, message: string) {
  if (!SSE_DEBUG) return;
  const counts = listenerCounts();
  console.log(`[SSE:${connectionId}] ${message}`, counts);
}

function debugMemory(connectionId: string, message: string) {
  if (!SSE_MEMORY_DEBUG) return;
  const memory = process.memoryUsage();
  console.log(`[SSE:${connectionId}] ${message}`, {
    rss: memory.rss,
    heapUsed: memory.heapUsed,
    heapTotal: memory.heapTotal,
    external: memory.external,
  });
}

function normalizeEventPayload(eventName: string, payload: any) {
  if (payload?.kind === 'delta' && payload?.schemaVersion === 1) {
    return payload;
  }

  const tournamentId =
    typeof payload?.tournamentId === 'string' && payload.tournamentId
      ? payload.tournamentId
      : '';

  if (!tournamentId) return payload;

  if (eventName === EVENTS.MATCH_UPDATE) {
    return createSseDeltaPayload({
      tournamentId,
      scope: 'match',
      action:
        payload?.type === 'started'
          ? 'started'
          : payload?.type === 'finished'
            ? 'finished'
            : payload?.type === 'leg-finished'
              ? 'leg-finished'
              : 'updated',
      data: payload,
    });
  }

  if (eventName === EVENTS.GROUP_UPDATE) {
    return createSseDeltaPayload({
      tournamentId,
      scope: 'group',
      action: 'standings-updated',
      data: payload,
      requiresResync: true,
    });
  }

  return createSseDeltaPayload({
    tournamentId,
    scope: 'tournament',
    action: payload?.type === 'knockout-update' ? 'knockout-updated' : 'updated',
    data: payload,
    requiresResync: payload?.type === 'knockout-update',
  });
}

async function __GET(req: NextRequest) {
  const encoder = new TextEncoder();
  const scopedTournamentId = req.nextUrl.searchParams.get('tournamentId')?.trim() || undefined;
  let scopedTournamentMongoId: string | undefined;
  const maxConnectionMs = clampMaxConnectionMs(req.nextUrl.searchParams.get('maxConnectionMs'));
  if (scopedTournamentId) {
    const tournament = await findTournamentByCode(scopedTournamentId);
    scopedTournamentMongoId = tournament?._id?.toString();
    const clubId = tournament?.clubId?.toString();
    if (clubId) {
      const eligibility = await assertEligibilityResult({
        featureName: 'socket',
        clubId,
        allowPaidOverride: true,
      });
      if (!eligibility.ok) {
        return NextResponse.json({ error: eligibility.message, code: eligibility.code }, { status: eligibility.status });
      }
    }
  }

  const connectionId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  let closeStream: ((reason: string) => void) | null = null;

  const customReadable = new ReadableStream({
    async start(controller) {
      let closed = false;

      const shouldDispatch = (data: any) => {
        if (!scopedTournamentId) return true;
        const eventTournamentId = data?.tournamentId;
        return (
          typeof eventTournamentId === 'string' &&
          (eventTournamentId === scopedTournamentId ||
            (scopedTournamentMongoId !== undefined &&
              eventTournamentId === scopedTournamentMongoId))
        );
      };

      const onTournamentUpdate = (data: any) => {
        if (!shouldDispatch(data)) return;
        safeEnqueue(
          EVENTS.TOURNAMENT_UPDATE,
          normalizeEventPayload(EVENTS.TOURNAMENT_UPDATE, data),
          'tournament-update-enqueue-failed'
        );
      };

      const onMatchUpdate = (data: any) => {
        if (!shouldDispatch(data)) return;
        safeEnqueue(
          EVENTS.MATCH_UPDATE,
          normalizeEventPayload(EVENTS.MATCH_UPDATE, data),
          'match-update-enqueue-failed'
        );
      };

      const onGroupUpdate = (data: any) => {
        if (!shouldDispatch(data)) return;
        safeEnqueue(
          EVENTS.GROUP_UPDATE,
          normalizeEventPayload(EVENTS.GROUP_UPDATE, data),
          'group-update-enqueue-failed'
        );
      };

      const onAbort = () => cleanup('request-aborted');

      const cleanup = (reason: string) => {
        if (closed) return;
        closed = true;
        clearInterval(keepAlive);
        clearTimeout(maxAgeTimer);
        if (memoryInterval) clearInterval(memoryInterval);
        eventEmitter.off(EVENTS.TOURNAMENT_UPDATE, onTournamentUpdate);
        eventEmitter.off(EVENTS.MATCH_UPDATE, onMatchUpdate);
        eventEmitter.off(EVENTS.GROUP_UPDATE, onGroupUpdate);
        req.signal.removeEventListener('abort', onAbort);
        try {
          controller.close();
        } catch {
          // no-op: stream may already be closed
        }
        debugLog(connectionId, `connection closed (${reason})`);
        debugMemory(connectionId, `memory snapshot (${reason})`);
      };
      closeStream = cleanup;

      const safeEnqueue = (event: string, payload: any, onErrorReason: string) => {
        if (closed) return false;
        try {
          controller.enqueue(encoder.encode(formatMessage(event, payload)));
          return true;
        } catch (error) {
          console.error(`Error sending SSE "${event}"`, error);
          cleanup(onErrorReason);
          return false;
        }
      };

      // Keep connection alive with heartbeat
      const keepAlive = setInterval(() => {
        safeEnqueue('heartbeat', { time: new Date().toISOString() }, 'heartbeat-enqueue-failed');
      }, HEARTBEAT_MS);

      const memoryInterval = SSE_MEMORY_DEBUG
        ? setInterval(() => {
          debugMemory(connectionId, 'periodic memory snapshot');
        }, 60_000)
        : undefined;

      const maxAgeTimer = setTimeout(() => {
        safeEnqueue('session-expired', {
          reason: 'max-connection-age-reached',
          maxConnectionMs,
        }, 'session-expired-enqueue-failed');
        cleanup('max-connection-age-reached');
      }, maxConnectionMs);

      // Subscribe
      eventEmitter.on(EVENTS.TOURNAMENT_UPDATE, onTournamentUpdate);
      eventEmitter.on(EVENTS.MATCH_UPDATE, onMatchUpdate);
      eventEmitter.on(EVENTS.GROUP_UPDATE, onGroupUpdate);
      debugLog(connectionId, `connection opened (scope=${scopedTournamentId ?? 'all'})`);
      debugMemory(connectionId, 'memory snapshot (opened)');

      // Send initial connection message
      safeEnqueue('connected', {
        message: 'SSE Connected',
        connectionId,
        tournamentId: scopedTournamentId ?? null,
        maxConnectionMs,
      }, 'connected-enqueue-failed');

      req.signal.addEventListener('abort', onAbort, { once: true });
    },
    cancel() {
      if (closeStream) {
        closeStream('stream-cancelled');
      } else {
        debugLog(connectionId, 'stream cancelled by consumer');
      }
    }
  });

  return new NextResponse(customReadable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, no-transform',
      'Pragma': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx/Cloudflare buffering
    },
  });
}

export const GET = withApiTelemetry('/api/updates', __GET as any);
