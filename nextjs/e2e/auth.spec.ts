import { test, expect } from "./fixtures";

const E2E_FIBER_API_KEY = process.env.E2E_FIBER_API_KEY;

test.describe("login with an API key", () => {
  test.skip(!E2E_FIBER_API_KEY, "E2E_FIBER_API_KEY is not set");

  test("submitting a valid key on /setup logs in and lands on search", async ({ page, consoleErrors }) => {
    await page.goto("/setup");

    // CardTitle (src/components/ui/card.tsx) renders a <div>, not a heading
    // element, so it has no accessible "heading" role — text selector instead.
    await expect(page.getByText("Welcome to OpenFiber")).toBeVisible();

    await page.locator("#api-key").fill(E2E_FIBER_API_KEY!);
    await page.getByTestId("api-key-submit").click();

    await expect(page).toHaveURL(/\/search\/companies$/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "Company Search" })).toBeVisible();

    expect(consoleErrors, `console errors: ${consoleErrors.join("\n")}`).toEqual([]);
  });

  test("an invalid key surfaces an inline error and does not navigate away", async ({ page }) => {
    await page.goto("/setup");

    await page.locator("#api-key").fill("sk_live_definitely_not_a_real_key");
    await page.getByTestId("api-key-submit").click();

    // set-api-key always succeeds (it just sets a cookie); the invalid key only
    // surfaces once the app tries to use it — the "/" gate then bounces back to
    // /setup?error=... per src/pages/index.tsx. Asserting the `error` query param
    // specifically (not just "still on /setup", which is trivially true the
    // instant the click handler returns, before this round-trip even starts)
    // forces Playwright to wait for the real redirect-away-and-back to happen.
    await expect(page).toHaveURL(/\/setup\?error=/, { timeout: 15_000 });
  });
});
