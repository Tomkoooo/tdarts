import { expect, test } from '@playwright/test';

const tournamentCode = process.env.E2E_TOURNAMENT_CODE || 'N7A8';

function expectNoServerError(status: number | null) {
  expect(status, 'Page should not return 5xx').not.toBeNull();
  expect(status!, 'Page should not return 5xx').toBeLessThan(500);
}

test.describe('critical flows (security + migrated actions)', () => {
  test('auth entry flow responds without server errors', async ({ page }) => {
    const response = await page.goto('/en/auth/login');
    expectNoServerError(response?.status() ?? null);
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('tournament page flow responds without server errors', async ({ page }) => {
    const response = await page.goto(`/en/tournaments/${tournamentCode}`);
    expectNoServerError(response?.status() ?? null);
  });

  test('match/board flow responds without server errors', async ({ page }) => {
    const response = await page.goto('/en/board/DEMO');
    expectNoServerError(response?.status() ?? null);
  });

  test('feature-flag dependent admin leagues flow responds without server errors', async ({ page }) => {
    const response = await page.goto('/en/admin/leagues');
    expectNoServerError(response?.status() ?? null);
  });

  test('payment callback GET is allowed (no 405) and returns bounded status', async ({ request }) => {
    const response = await request.get('/api/payments/verify?session_id=load-test-session');
    expect(response.status(), 'Stripe success_url uses GET; 405 must not occur').not.toBe(405);
    expect([200, 302, 307, 400, 401, 404]).toContain(response.status());
  });

  test('updates manifest is JSON when SSE query hints are absent', async ({ request }) => {
    const response = await request.get('/api/updates');
    expectNoServerError(response.status());
    expect(response.headers()['content-type'] || '').toContain('application/json');
  });

  test('updates stream returns event-stream when scoped like the realtime hook', async ({ request }) => {
    const response = await request.get('/api/updates?maxConnectionMs=120000&tournamentId=E2E');
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type'] || '').toContain('text/event-stream');
  });
});
