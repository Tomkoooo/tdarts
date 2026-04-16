import type { NextRequest } from 'next/server';
import { EVENTS, createSseDeltaPayload, eventsBus } from '@tdarts/core';

export const runtime = 'nodejs';

/**
 * Gated test-only endpoint: triggers an in-process tournament SSE event.
 * Disabled unless ALLOW_E2E_SSE_TEST=true (e.g. Playwright smoke in CI).
 */
export async function POST(request: NextRequest) {
  if (process.env.ALLOW_E2E_SSE_TEST !== 'true') {
    return new Response(null, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'invalid json' }, { status: 400 });
  }

  const tournamentId =
    typeof body === 'object' &&
    body !== null &&
    'tournamentId' in body &&
    typeof (body as { tournamentId?: unknown }).tournamentId === 'string'
      ? (body as { tournamentId: string }).tournamentId.trim()
      : '';

  if (!tournamentId) {
    return Response.json({ error: 'tournamentId required' }, { status: 400 });
  }

  eventsBus.publish(
    EVENTS.TOURNAMENT_UPDATE,
    createSseDeltaPayload({
      tournamentId,
      scope: 'tournament',
      action: 'updated',
      data: { e2ePing: true },
    }),
  );

  return Response.json({ ok: true });
}
