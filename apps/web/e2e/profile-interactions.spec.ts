import { test } from '@playwright/test';
import { assertNoCriticalDiagnostics } from './helpers/assertions';
import { attachDiagnostics } from './helpers/diagnostics';
import { clickIfVisible, gotoAndWaitStable, openDialogIfPresent } from './helpers/navigation';

test.describe('profile interactions diagnostics', () => {
  test('profile tabs and ticket interactions', async ({ page }, testInfo) => {
    test.skip(
      !testInfo.project.name.includes('auth'),
      'Profile interactions require authenticated project.'
    );

    const diagnostics = await attachDiagnostics(page, testInfo, 'profile-interactions');
    await gotoAndWaitStable(page, '/en/profile');

    await clickIfVisible(page, [
      '[role="tab"]:has-text("Profile")',
      '[role="tab"]:has-text("Profil")',
      'button:has-text("Profile")',
      'button:has-text("Profil")',
    ]);
    await clickIfVisible(page, [
      '[role="tab"]:has-text("Stats")',
      '[role="tab"]:has-text("Statiszt")',
      'button:has-text("Stats")',
      'button:has-text("Statiszt")',
    ]);
    await clickIfVisible(page, [
      '[role="tab"]:has-text("Tickets")',
      '[role="tab"]:has-text("Jegy")',
      'button:has-text("Tickets")',
      'button:has-text("Jegy")',
    ]);
    await clickIfVisible(page, [
      '[role="tab"]:has-text("Leagues")',
      '[role="tab"]:has-text("Liga")',
      'button:has-text("Leagues")',
      'button:has-text("Liga")',
    ]);

    await clickIfVisible(page, [
      'button:has-text("Open")',
      'button:has-text("Megnyit")',
      '[data-testid="ticket-open"]',
    ]);
    await openDialogIfPresent(page);

    const { report } = await diagnostics.stop();
    assertNoCriticalDiagnostics(report);
  });
});
