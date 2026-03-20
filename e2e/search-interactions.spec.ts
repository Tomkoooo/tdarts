import { expect, test } from '@playwright/test';
import { assertNoCriticalDiagnostics } from './helpers/assertions';
import { attachDiagnostics } from './helpers/diagnostics';
import { clickIfVisible, gotoAndWaitStable, openDialogIfPresent } from './helpers/navigation';

async function navigateByVisibleLink(
  page: Parameters<typeof clickIfVisible>[0],
  selectors: string[],
  urlPattern: RegExp
): Promise<void> {
  const clicked = await clickIfVisible(page, selectors);
  expect(clicked, `Expected to find visible link from selectors: ${selectors.join(', ')}`).toBe(true);
  await page.waitForURL(urlPattern, { timeout: 10_000 });
}

async function expectSearchToSettle(page: Parameters<typeof clickIfVisible>[0]): Promise<void> {
  const tabList = page.locator('[role="tablist"]').first();
  await expect(tabList).toBeVisible({ timeout: 10_000 });

  const headerSpinner = page.locator('main').locator('.animate-spin').first();
  await expect
    .poll(async () => headerSpinner.isVisible().catch(() => false), { timeout: 12_000, intervals: [200, 500, 1000] })
    .toBe(false);
}

test.describe('search interactions diagnostics', () => {
  test('search page tabs, filters, and map toggles', async ({ page }, testInfo) => {
    const diagnostics = await attachDiagnostics(
      page,
      testInfo,
      'search-interactions',
      {
        ignoreResponseUrlPatterns: [/googleapis\.com/, /fonts\.gstatic\.com/],
      }
    );

    await gotoAndWaitStable(page, '/en/home');

    await navigateByVisibleLink(
      page,
      ['a[href="/en/search"]', 'a[href^="/en/search?"]', 'a[href="/search"]', 'a[href^="/search?"]'],
      /\/search(\?|$)/
    );
    await expectSearchToSettle(page);

    await navigateByVisibleLink(
      page,
      ['a[href="/en/home"]', 'a[href="/home"]', 'a[href="/en"]', 'a[href="/en/"]', 'a[href="/"]'],
      /(?:\/en(?:\/home)?|\/home|\/)$/
    );
    await page.waitForTimeout(250);

    await navigateByVisibleLink(
      page,
      ['a[href="/en/search"]', 'a[href^="/en/search?"]', 'a[href="/search"]', 'a[href^="/search?"]'],
      /\/search(\?|$)/
    );
    await expectSearchToSettle(page);

    await clickIfVisible(page, [
      'button:has-text("Players")',
      'button:has-text("Játékosok")',
      '[role="tab"]:has-text("Players")',
      '[role="tab"]:has-text("Játékosok")',
    ]);

    await clickIfVisible(page, [
      'button:has-text("Clubs")',
      'button:has-text("Klubok")',
      '[role="tab"]:has-text("Clubs")',
      '[role="tab"]:has-text("Klubok")',
    ]);

    await clickIfVisible(page, [
      'button:has-text("Tournaments")',
      'button:has-text("Versenyek")',
      '[role="tab"]:has-text("Tournaments")',
      '[role="tab"]:has-text("Versenyek")',
    ]);

    await clickIfVisible(page, [
      'button:has-text("Map")',
      'button:has-text("Térkép")',
      '[data-testid="search-map-toggle"]',
    ]);

    await clickIfVisible(page, [
      'button:has-text("Filters")',
      'button:has-text("Szűrők")',
      '[data-testid="search-filters-toggle"]',
    ]);

    await openDialogIfPresent(page);
    await page.waitForTimeout(400);

    const { report } = await diagnostics.stop();
    assertNoCriticalDiagnostics(report);
  });
});
