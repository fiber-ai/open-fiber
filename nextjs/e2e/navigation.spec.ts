import { test, expect } from "./fixtures";
import { STATIC_ROUTES } from "./routes";

// Exhaustive smoke coverage: every static content route (40 of the 42 static routes —
// "/" and "/setup" are covered separately by account-credits.spec.ts's root-gate
// assertion and auth.spec.ts's login flow, since they don't behave like content pages).
// Assertions are intentionally uniform and cheap: all 40 routes render through the same
// AppLayout shell with a <Header title=...> (verified: every page, including the two
// that delegate to the shared TrackerLists component, renders an <h1>) and none require
// query params to render meaningfully.
for (const route of STATIC_ROUTES) {
  test(`${route.label} (${route.path}) renders without error`, async ({ page, consoleErrors }) => {
    await page.goto(route.path);

    await expect(page.locator("aside")).toBeVisible();
    await expect(page.locator("h1")).toBeVisible({ timeout: 15_000 });

    await page.waitForLoadState("networkidle");

    await expect(page.getByTestId("error-display")).toHaveCount(0);

    expect(consoleErrors, `console errors on ${route.path}:\n${consoleErrors.join("\n")}`).toEqual([]);
  });
}
