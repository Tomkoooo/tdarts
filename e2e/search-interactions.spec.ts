import { test } from '@playwright/test';
import { assertNoCriticalDiagnostics } from './helpers/assertions';
import { attachDiagnostics } from './helpers/diagnostics';
import { clickIfVisible, gotoAndWaitStable, openDialogIfPresent } from './helpers/navigation';

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

    await gotoAndWaitStable(page, '/en/search');

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
