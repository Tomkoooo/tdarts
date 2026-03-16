import path from 'node:path';
import type { Page } from '@playwright/test';

export const E2E_AUTH_STATE_PATH = path.resolve(
  process.cwd(),
  'e2e/.auth/user.json'
);

export function getAuthCredentials(): { email: string; password: string } {
  const email = process.env.E2E_AUTH_EMAIL;
  const password = process.env.E2E_AUTH_PASSWORD;
  if (!email || !password) {
    throw new Error(
      'Missing E2E auth credentials. Set E2E_AUTH_EMAIL and E2E_AUTH_PASSWORD.'
    );
  }
  return { email, password };
}

export async function loginWithUi(page: Page): Promise<void> {
  const { email, password } = getAuthCredentials();

  const apiLogin = await page.request.post('/api/auth/login', {
    data: { email, password },
    headers: { 'Content-Type': 'application/json' },
  });
  if (apiLogin.ok()) {
    await page.goto('/en/home', { waitUntil: 'domcontentloaded' });
    return;
  }

  await page.goto('/en/auth/login', { waitUntil: 'domcontentloaded' });

  const emailInput = page
    .locator('input[type="email"], input[name="email"]')
    .first();
  if (!(await emailInput.isVisible().catch(() => false))) {
    const toggleSelectors = [
      'button[aria-expanded]',
      'button:has-text("Email")',
      'button:has-text("email")',
      'button:has-text("mail")',
    ];
    for (const selector of toggleSelectors) {
      const toggle = page.locator(selector).first();
      if (await toggle.isVisible().catch(() => false)) {
        await toggle.click();
        await page.waitForTimeout(250);
        if (await emailInput.isVisible().catch(() => false)) {
          break;
        }
      }
    }
  }

  const passwordInput = page
    .locator('input[type="password"], input[name="password"]')
    .first();

  await emailInput.waitFor({ state: 'visible', timeout: 10_000 });
  await emailInput.fill(email);
  await passwordInput.fill(password);

  const submitButton = page.getByRole('button', { name: /login|sign in|bejelent/i }).last();
  if (await submitButton.isVisible().catch(() => false)) {
    await submitButton.click();
  } else {
    await passwordInput.press('Enter');
  }

  await page.waitForTimeout(500);
  const loginSucceeded = async () => {
    const urlOk = !page.url().includes('/auth/login');
    if (urlOk) return true;
    const cookies = await page.context().cookies();
    const hasToken = cookies.some((cookie) => cookie.name === 'token' && Boolean(cookie.value));
    return hasToken;
  };

  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    if (await loginSucceeded()) {
      if (page.url().includes('/auth/login')) {
        await page.goto('/en/home', { waitUntil: 'domcontentloaded' });
      }
      return;
    }
    await page.waitForTimeout(500);
  }

  throw new Error(`Login did not complete within timeout. Current URL: ${page.url()}`);
}
