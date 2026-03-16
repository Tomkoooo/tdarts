import { expect, test } from "@playwright/test";
const tournamentCode = process.env.E2E_TOURNAMENT_CODE || "N7A8";

function expectNoServerError(status: number | null) {
  expect(status, "Page should not return 5xx").not.toBeNull();
  expect(status!, "Page should not return 5xx").toBeLessThan(500);
}

test.describe("board writer flow", () => {
  test("board entry page loads without server errors", async ({ page }) => {
    const response = await page.goto("/en/board");
    expectNoServerError(response?.status() ?? null);
    await expect(page).toHaveURL(/\/board/);
  });

  test("board auth screen renders with tournament code and password inputs", async ({
    page,
  }) => {
    await page.goto("/en/board");
    await expect(
      page.getByRole("textbox", { name: /torna|code|kód/i })
    ).toBeVisible();
    await expect(
      page.getByRole("textbox", { name: /password|jelszó/i })
    ).toBeVisible();
  });

  test("board tournament page loads without server errors", async ({
    page,
  }) => {
    const response = await page.goto(`/en/board/${tournamentCode}`);
    expectNoServerError(response?.status() ?? null);
  });

  test("board tournament page shows auth or board selection", async ({
    page,
  }) => {
    await page.goto(`/en/board/${tournamentCode}`);
    const hasPasswordInput = await page
      .getByRole("textbox", { name: /password|jelszó/i })
      .isVisible()
      .catch(() => false);
    const hasBoardGrid = await page
      .getByText(/válassz|select|tábla/i)
      .isVisible()
      .catch(() => false);
    expect(hasPasswordInput || hasBoardGrid).toBeTruthy();
  });
});
