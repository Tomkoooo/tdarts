import { expect, test } from "@playwright/test";

function expectNoServerError(status: number | null) {
  expect(status, "Page should not return 5xx").not.toBeNull();
  expect(status!, "Page should not return 5xx").toBeLessThan(500);
}

test.describe("tournament admin flow", () => {
  test("tournament page loads without server errors", async ({ page }) => {
    const response = await page.goto("/en/tournaments/DEMO");
    expectNoServerError(response?.status() ?? null);
  });

  test("tournament page shows header and tabs", async ({ page }) => {
    await page.goto("/en/tournaments/DEMO");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const tabs = page.getByRole("tablist");
    await expect(tabs).toBeVisible();
  });

  test("tournament page tab navigation works", async ({ page }) => {
    await page.goto("/en/tournaments/DEMO");
    const playersTab = page.getByRole("tab", { name: /players|játékos/i });
    if (await playersTab.isVisible()) {
      await playersTab.click();
      await expect(playersTab).toHaveAttribute("data-state", "active");
    }
  });

  test("club page with create tournament loads", async ({ page }) => {
    const response = await page.goto("/en/clubs/DEMO");
    expectNoServerError(response?.status() ?? null);
  });
});
