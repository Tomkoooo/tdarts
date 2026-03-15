import { expect, test } from '@playwright/test';

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
    const response = await page.goto('/en/tournaments/DEMO');
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

  test('payment callback flow returns bounded status', async ({ request }) => {
    const response = await request.get('/api/payments/verify?session_id=load-test-session');
    expect([200, 302, 307, 400, 401, 404]).toContain(response.status());
  });
});
