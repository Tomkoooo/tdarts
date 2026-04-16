import { NextRequest } from 'next/server';
import { createSseUpdatesResponse, requestWantsSse } from '@/app/api/updates/sseUpdatesResponse';
import { EVENTS, eventsBus, createSseDeltaPayload } from '@tdarts/core';

function makeRequest(url: string, init?: ConstructorParameters<typeof NextRequest>[1]): NextRequest {
  return new NextRequest(url, init);
}

type SseMessage = { event: string; data: unknown };

function parseSseBlocks(raw: string): SseMessage[] {
  const blocks = raw.split(/\n\n+/).filter(Boolean);
  const out: SseMessage[] = [];
  for (const block of blocks) {
    let event = 'message';
    let dataLine = '';
    for (const line of block.split('\n')) {
      if (line.startsWith('event: ')) event = line.slice(7).trim();
      if (line.startsWith('data: ')) dataLine = line.slice(6);
    }
    if (dataLine) {
      try {
        out.push({ event, data: JSON.parse(dataLine) });
      } catch {
        out.push({ event, data: dataLine });
      }
    }
  }
  return out;
}

async function collectFromResponse(
  response: Response,
  opts: { until?: (msgs: SseMessage[]) => boolean; timeoutMs?: number } = {},
): Promise<SseMessage[]> {
  const { until, timeoutMs = 8000 } = opts;
  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');
  const decoder = new TextDecoder();
  let buf = '';
  const collected: SseMessage[] = [];

  const cancelOnTimeout = setTimeout(() => {
    reader.cancel().catch(() => {});
  }, timeoutMs);

  try {
    while (true) {
      let chunk: ReadableStreamReadResult<Uint8Array>;
      try {
        chunk = await reader.read();
      } catch {
        break;
      }
      const { done, value } = chunk;
      if (value) buf += decoder.decode(value, { stream: !done });
      const msgs = parseSseBlocks(buf);
      if (msgs.length > collected.length) {
        for (let i = collected.length; i < msgs.length; i++) collected.push(msgs[i]);
        if (until?.(collected)) return collected;
      }
      if (done) break;
    }
  } finally {
    clearTimeout(cancelOnTimeout);
    await reader.cancel().catch(() => {});
  }
  return collected;
}

describe('requestWantsSse', () => {
  it('returns true when Accept includes text/event-stream', () => {
    const req = makeRequest('http://localhost/api/updates', {
      headers: { Accept: 'text/event-stream' },
    });
    expect(requestWantsSse(req)).toBe(true);
  });

  it('returns true when maxConnectionMs query hint is present', () => {
    const req = makeRequest('http://localhost/api/updates?maxConnectionMs=120000');
    expect(requestWantsSse(req)).toBe(true);
  });

  it('returns true when tournamentId query hint is present', () => {
    const req = makeRequest('http://localhost/api/updates?tournamentId=ABCD');
    expect(requestWantsSse(req)).toBe(true);
  });

  it('returns false for manifest GET without SSE hints', () => {
    const req = makeRequest('http://localhost/api/updates');
    expect(requestWantsSse(req)).toBe(false);
  });
});

describe('createSseUpdatesResponse', () => {
  it('returns 403 JSON when scoped SSE is required and tournamentId is missing', async () => {
    const prev = process.env.FF_REALTIME_REQUIRE_SCOPED_SSE;
    process.env.FF_REALTIME_REQUIRE_SCOPED_SSE = 'true';
    let createResp: (req: NextRequest) => Response;
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      createResp = require('@/app/api/updates/sseUpdatesResponse').createSseUpdatesResponse;
    });
    const req = makeRequest('http://localhost/api/updates?maxConnectionMs=120000');
    const res = createResp!(req);
    expect(res.status).toBe(403);
    expect(res.headers.get('content-type')).toContain('application/json');
    const body = await res.json();
    expect(body.error).toContain('tournamentId');
    process.env.FF_REALTIME_REQUIRE_SCOPED_SSE = prev;
  });

  it('streams initial message and forwards tournament-update for scoped tournamentId', async () => {
    const ac = new AbortController();
    const tid = 'sse-test-tourney-1';
    const req = makeRequest(`http://localhost/api/updates?tournamentId=${tid}&maxConnectionMs=120000`, {
      signal: ac.signal,
    });
    const res = createSseUpdatesResponse(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/event-stream');

    const readPromise = collectFromResponse(res, {
      until: (msgs) => msgs.some((m) => m.event === 'tournament-update'),
      timeoutMs: 5000,
    });

    const payload = createSseDeltaPayload({
      tournamentId: tid,
      scope: 'tournament',
      action: 'updated',
      data: { legacyType: 'boards' },
      sectionHint: 'boards',
    });
    eventsBus.publish(EVENTS.TOURNAMENT_UPDATE, payload);

    const msgs = await readPromise;
    ac.abort();

    expect(msgs.some((m) => m.event === 'message' && (m.data as any)?.message === 'SSE Connected')).toBe(true);
    const tu = msgs.find((m) => m.event === 'tournament-update');
    expect(tu).toBeDefined();
    expect((tu!.data as any).tournamentId).toBe(tid);
    expect((tu!.data as any).kind).toBe('delta');
  });

  it('scoped client does not receive updates for a different tournament', async () => {
    const ac = new AbortController();
    const req = makeRequest('http://localhost/api/updates?tournamentId=scoped-A&maxConnectionMs=120000', {
      signal: ac.signal,
    });
    const res = createSseUpdatesResponse(req);

    const readPromise = collectFromResponse(res, { timeoutMs: 1500 });
    eventsBus.publish(
      EVENTS.TOURNAMENT_UPDATE,
      createSseDeltaPayload({
        tournamentId: 'other-B',
        scope: 'tournament',
        action: 'updated',
        data: {},
      }),
    );

    const msgs = await readPromise;
    ac.abort();

    expect(msgs.some((m) => m.event === 'tournament-update')).toBe(false);
  });

  it('unscoped stream with includeGlobal receives global-channel tournament updates', async () => {
    const ac = new AbortController();
    const req = makeRequest('http://localhost/api/updates?maxConnectionMs=120000', { signal: ac.signal });
    const res = createSseUpdatesResponse(req);

    const readPromise = collectFromResponse(res, {
      until: (msgs) => msgs.some((m) => m.event === 'tournament-update'),
      timeoutMs: 5000,
    });

    eventsBus.publish(EVENTS.TOURNAMENT_UPDATE, { noTournamentId: true } as any);

    const msgs = await readPromise;
    ac.abort();

    expect(msgs.some((m) => m.event === 'tournament-update')).toBe(true);
  });

  it('forwards match-update and group-update', async () => {
    const ac = new AbortController();
    const tid = 'sse-test-tourney-2';
    const req = makeRequest(`http://localhost/api/updates?tournamentId=${tid}&maxConnectionMs=120000`, {
      signal: ac.signal,
    });
    const res = createSseUpdatesResponse(req);

    const readPromise = collectFromResponse(res, {
      until: (msgs) =>
        msgs.some((m) => m.event === 'match-update') && msgs.some((m) => m.event === 'group-update'),
      timeoutMs: 6000,
    });

    eventsBus.publish(
      EVENTS.MATCH_UPDATE,
      createSseDeltaPayload({
        tournamentId: tid,
        scope: 'match',
        action: 'started',
        data: { legacyType: 'started', matchId: 'm1' },
      }),
    );
    eventsBus.publish(
      EVENTS.GROUP_UPDATE,
      createSseDeltaPayload({
        tournamentId: tid,
        scope: 'group',
        action: 'standings-updated',
        data: {},
      }),
    );

    const msgs = await readPromise;
    ac.abort();

    expect(msgs.find((m) => m.event === 'match-update')).toBeDefined();
    expect(msgs.find((m) => m.event === 'group-update')).toBeDefined();
  });
});
