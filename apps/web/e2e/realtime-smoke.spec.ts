import { expect, test } from '@playwright/test';

test.describe('realtime SSE smoke', () => {
  test('EventSource receives tournament-update after gated sse-ping', async ({ page }) => {
    test.skip(
      process.env.ALLOW_E2E_SSE_TEST !== 'true',
      'Set ALLOW_E2E_SSE_TEST=true (CI enables this for the smoke job)',
    );

    await page.goto('/en/auth/login', { waitUntil: 'domcontentloaded' });

    const tournamentId = `e2e-sse-${Date.now()}`;

    await page.evaluate((tid) => {
      (window as unknown as { __sseTournamentPayload: unknown | null }).__sseTournamentPayload = null;
      const es = new EventSource(
        `${window.location.origin}/api/updates?tournamentId=${encodeURIComponent(tid)}&maxConnectionMs=120000`,
      );
      (window as unknown as { __sseEs: EventSource }).__sseEs = es;
      es.addEventListener('tournament-update', (ev: MessageEvent) => {
        try {
          (window as unknown as { __sseTournamentPayload: unknown }).__sseTournamentPayload = JSON.parse(
            ev.data as string,
          );
        } catch {
          (window as unknown as { __sseTournamentPayload: unknown }).__sseTournamentPayload = { parseError: true };
        }
        es.close();
      });
    }, tournamentId);

    const ping = await page.request.post('/api/__e2e/sse-ping', {
      data: { tournamentId },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(ping.ok(), await ping.text()).toBe(true);

    await page.waitForFunction(
      () =>
        (window as unknown as { __sseTournamentPayload?: unknown | null }).__sseTournamentPayload != null,
      { timeout: 15_000 },
    );

    const payload = await page.evaluate(
      () => (window as unknown as { __sseTournamentPayload: { tournamentId?: string; kind?: string } }).__sseTournamentPayload,
    );
    expect(payload?.kind).toBe('delta');
    expect(payload?.tournamentId).toBe(tournamentId);

    await page.evaluate(() => {
      const w = window as unknown as { __sseEs?: EventSource };
      w.__sseEs?.close();
    });
  });
});
