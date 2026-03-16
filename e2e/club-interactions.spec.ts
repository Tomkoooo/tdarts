import { test } from '@playwright/test';
import { assertNoCriticalDiagnostics } from './helpers/assertions';
import { attachDiagnostics } from './helpers/diagnostics';
import { clickIfVisible, gotoAndWaitStable, openDialogIfPresent } from './helpers/navigation';

const clubCode = process.env.E2E_CLUB_CODE || '68f6afb145352f8e4076ed55';

test.describe('club interactions diagnostics', () => {
  test('my club and club detail tabs/modals', async ({ page }, testInfo) => {
    test.skip(
      !testInfo.project.name.includes('auth'),
      'Club interactions require authenticated project.'
    );

    const diagnostics = await attachDiagnostics(page, testInfo, 'club-interactions');
    await gotoAndWaitStable(page, '/en/myclub');

    await clickIfVisible(page, [
      'a[href*="/clubs/"]',
      '[data-testid="club-card"] a',
      'button:has-text("View")',
      'button:has-text("Megtekint")',
    ]);

    if (!page.url().includes('/clubs/')) {
      await gotoAndWaitStable(page, `/en/clubs/${clubCode}`);
    }

    await clickIfVisible(page, [
      '[role="tab"]:has-text("Posts")',
      '[role="tab"]:has-text("Poszt")',
      'button:has-text("Posts")',
      'button:has-text("Poszt")',
    ]);
    await clickIfVisible(page, [
      '[role="tab"]:has-text("Gallery")',
      '[role="tab"]:has-text("Galéria")',
      'button:has-text("Gallery")',
      'button:has-text("Galéria")',
    ]);
    await clickIfVisible(page, [
      '[role="tab"]:has-text("Leagues")',
      '[role="tab"]:has-text("Liga")',
      'button:has-text("Leagues")',
      'button:has-text("Liga")',
    ]);
    await clickIfVisible(page, [
      '[role="tab"]:has-text("Settings")',
      '[role="tab"]:has-text("Beállítás")',
      'button:has-text("Settings")',
      'button:has-text("Beállítás")',
    ]);

    await openDialogIfPresent(page);
    await page.waitForTimeout(500);

    const { report } = await diagnostics.stop();
    assertNoCriticalDiagnostics(report);
  });
});
