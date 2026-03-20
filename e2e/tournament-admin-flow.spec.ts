import { expect, test } from "@playwright/test";
const tournamentCode = process.env.E2E_TOURNAMENT_CODE || "N7A8";
const clubCode = process.env.E2E_CLUB_CODE || "68f6afb145352f8e4076ed55";

function expectNoServerError(status: number | null) {
  expect(status, "Page should not return 5xx").not.toBeNull();
  expect(status!, "Page should not return 5xx").toBeLessThan(500);
}

test.describe("tournament admin flow", () => {
  test("tournament page loads without server errors", async ({ page }) => {
    const response = await page.goto(`/en/tournaments/${tournamentCode}`);
    expectNoServerError(response?.status() ?? null);
  });

  test("tournament page shows header and tabs", async ({ page }) => {
    await page.goto(`/en/tournaments/${tournamentCode}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const tabs = page.getByRole("tablist");
    await expect(tabs).toBeVisible();
  });

  test("tournament page tab navigation works", async ({ page }) => {
    await page.goto(`/en/tournaments/${tournamentCode}`);
    const playersTab = page.getByRole("tab", { name: /players|játékos/i }).first();
    if (await playersTab.isVisible()) {
      await playersTab.click();
      await expect(playersTab).toHaveAttribute("data-state", "active");
    }
  });

  test("club page with create tournament loads", async ({ page }) => {
    const response = await page.goto(`/en/clubs/${clubCode}`);
    expectNoServerError(response?.status() ?? null);
  });
});
