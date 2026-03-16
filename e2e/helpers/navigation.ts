import { expect, type Page } from '@playwright/test';

type GotoStableOptions = {
  waitForSelector?: string;
  timeoutMs?: number;
};

export async function gotoAndWaitStable(
  page: Page,
  route: string,
  options: GotoStableOptions = {}
): Promise<void> {
  const timeoutMs = options.timeoutMs ?? 20_000;
  const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
  expect(response?.status(), `Expected route ${route} not to return 5xx`).toBeLessThan(
    500
  );

  await page.waitForLoadState('domcontentloaded', { timeout: timeoutMs });
  await page.waitForTimeout(300);
  try {
    await page.waitForLoadState('networkidle', { timeout: 3_000 });
  } catch {
    // Some pages keep polling in background; avoid hard-failing for diagnostic suites.
  }

  if (options.waitForSelector) {
    await page.locator(options.waitForSelector).first().waitFor({
      state: 'visible',
      timeout: timeoutMs,
    });
  }
}

export async function clickIfVisible(page: Page, selectors: string[]): Promise<boolean> {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if (await locator.isVisible().catch(() => false)) {
      await locator.click();
      return true;
    }
  }
  return false;
}

export async function openDialogIfPresent(page: Page): Promise<boolean> {
  const opened = await clickIfVisible(page, [
    '[data-testid*="open-modal"]',
    '[data-testid*="modal-trigger"]',
    'button:has-text("Share")',
    'button:has-text("Megoszt")',
    'button:has-text("Settings")',
    'button:has-text("Beállítás")',
  ]);
  if (!opened) return false;
  await page.getByRole('dialog').first().waitFor({ state: 'visible', timeout: 5_000 });
  await page.keyboard.press('Escape');
  return true;
}
