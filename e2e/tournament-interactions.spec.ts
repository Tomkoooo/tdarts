import { test } from '@playwright/test';
import { assertNoCriticalDiagnostics } from './helpers/assertions';
import { attachDiagnostics } from './helpers/diagnostics';
import { clickIfVisible, gotoAndWaitStable, openDialogIfPresent } from './helpers/navigation';

const tournamentCode = process.env.E2E_TOURNAMENT_CODE || 'N7A8';

test.describe('tournament interactions diagnostics', () => {
  test('tournament tabs and dialogs render cleanly', async ({ page }, testInfo) => {
    const diagnostics = await attachDiagnostics(page, testInfo, 'tournament-interactions');
    await gotoAndWaitStable(page, `/en/tournaments/${tournamentCode}`);

    await clickIfVisible(page, [
      '[role="tab"]:has-text("Overview")',
      '[role="tab"]:has-text("Áttekintés")',
      'button:has-text("Overview")',
      'button:has-text("Áttekintés")',
    ]);
    await clickIfVisible(page, [
      '[role="tab"]:has-text("Players")',
      '[role="tab"]:has-text("Játékos")',
      'button:has-text("Players")',
      'button:has-text("Játékos")',
    ]);
    await clickIfVisible(page, [
      '[role="tab"]:has-text("Groups")',
      '[role="tab"]:has-text("Csoport")',
      'button:has-text("Groups")',
      'button:has-text("Csoport")',
    ]);
    await clickIfVisible(page, [
      '[role="tab"]:has-text("Bracket")',
      '[role="tab"]:has-text("Ágrajz")',
      'button:has-text("Bracket")',
      'button:has-text("Ágrajz")',
    ]);

    await clickIfVisible(page, [
      'button:has-text("Admin")',
      'button:has-text("Szervező")',
      '[data-testid="tournament-admin-tab"]',
    ]);

    await openDialogIfPresent(page);
    await page.waitForTimeout(500);

    const { report } = await diagnostics.stop();
    assertNoCriticalDiagnostics(report, {
      allowResponsePatterns: [/\/api\/tournaments\/.*\/reopen/],
    });
  });
});
