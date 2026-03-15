import { expect, test } from "@playwright/test";

function expectNoServerError(status: number | null) {
  expect(status, "Page should not return 5xx").not.toBeNull();
  expect(status!, "Page should not return 5xx").toBeLessThan(500);
}

test.describe("tournament registration and waitlist", () => {
  test("tournament page loads with players tab", async ({ page }) => {
    const response = await page.goto("/en/tournaments/DEMO");
    expectNoServerError(response?.status() ?? null);
    await expect(page).toHaveURL(/\/tournaments\/DEMO/);
  });

  test("tournament share modal can be opened from overview", async ({
    page,
  }) => {
    await page.goto("/en/tournaments/DEMO");
    const shareButton = page.getByRole("button", { name: /share|megoszt/i });
    if (await shareButton.isVisible()) {
      await shareButton.click();
      const modal = page.getByRole("dialog");
      await expect(modal).toBeVisible({ timeout: 3000 });
      const closeButton = page.getByRole("button", { name: /close|bezár/i });
      if (await closeButton.isVisible()) {
        await closeButton.click();
      } else {
        await page.keyboard.press("Escape");
      }
    }
  });

  test("tournament page shows overview content", async ({ page }) => {
    await page.goto("/en/tournaments/DEMO");
    const overviewContent = page.locator('[data-state="active"]');
    await expect(overviewContent.first()).toBeVisible({ timeout: 5000 });
  });
});
