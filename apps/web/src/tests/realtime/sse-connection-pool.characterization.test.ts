import { NextRequest } from 'next/server';
import { createSseUpdatesResponse } from '@/app/api/updates/sseUpdatesResponse';
import { EVENTS, eventsBus, createSseDeltaPayload } from '@tdarts/core';

/**
 * In-process burst coverage: many publishes on the shared events bus must all reach
 * an open SSE stream. Complements Mongo pool tuning in connectMongo (see env vars
 * MONGO_MAX_POOL_SIZE, MONGO_WAIT_QUEUE_TIMEOUT_MS in packages/core mongoose helper).
 */
describe('SSE + connection pressure (characterization)', () => {
  it('many in-process SSE publishes remain observable under burst (same bus)', async () => {
    const ac = new AbortController();
    const tid = `burst-${Date.now()}`;
    const res = createSseUpdatesResponse(
      new NextRequest(`http://localhost/api/updates?tournamentId=${tid}&maxConnectionMs=120000`, {
        signal: ac.signal,
      }),
    );

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    const tournamentEvents: string[] = [];
    const deadline = Date.now() + 10_000;

    const readLoop = (async () => {
      try {
        while (Date.now() < deadline) {
          const { done, value } = await reader.read();
          if (value) buf += decoder.decode(value, { stream: !done });
          const parts = buf.split(/\n\n+/);
          buf = parts.pop() ?? '';
          for (const block of parts) {
            if (!block.includes('event: tournament-update')) continue;
            const dataLine = block.split('\n').find((l) => l.startsWith('data: '));
            if (dataLine) tournamentEvents.push(dataLine.slice(6));
          }
          if (tournamentEvents.length >= 25) break;
          if (done) break;
        }
      } finally {
        await reader.cancel().catch(() => {});
      }
    })();

    for (let i = 0; i < 25; i++) {
      eventsBus.publish(
        EVENTS.TOURNAMENT_UPDATE,
        createSseDeltaPayload({
          tournamentId: tid,
          scope: 'tournament',
          action: 'updated',
          data: { i },
        }),
      );
    }

    await readLoop;
    ac.abort();

    expect(tournamentEvents.length).toBeGreaterThanOrEqual(25);
    const parsed = tournamentEvents.map((s) => JSON.parse(s) as { data?: { i?: number } });
    expect(parsed.filter((p) => typeof p.data?.i === 'number').length).toBe(25);
  }, 15_000);
});
