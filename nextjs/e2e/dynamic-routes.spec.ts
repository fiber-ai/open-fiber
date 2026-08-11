import { test, expect } from "./fixtures";
import { DYNAMIC_ROUTES } from "./routes";

// Conditional coverage of the 4 dynamic detail routes. Rather than creating/deleting
// entities through the UI (which would mutate the real E2E org — ruled out in plan
// section 6), each test reads the index page's existing data first: if the org has at
// least one entity of that type, it visits the real detail page and asserts it renders
// without error; if none exist, it skips with an explicit, visible reason rather than
// silently passing (per the "no silent caps" principle).
for (const route of DYNAMIC_ROUTES) {
  test(`${route.name}: visits an existing entity if one exists`, async ({ page, consoleErrors }) => {
    await page.goto(route.indexPath);
    await page.waitForLoadState("networkidle");

    const items = page.locator(route.itemSelector);
    const count = await items.count();

    test.skip(
      count === 0,
      `No existing ${route.name.toLowerCase()} entities found at ${route.indexPath} — ` +
        `this route isn't covered until the E2E org has at least one. See plan section 2b.`
    );

    await items.first().click();
    await expect(page).toHaveURL(new RegExp(route.detailPathPrefix.replace(/\//g, "\\/")), {
      timeout: 15_000,
    });

    await page.waitForLoadState("networkidle");

    if (route.hasErrorUi) {
      await expect(page.getByTestId("error-display")).toHaveCount(0);
    }
    // Tracker detail currently has no visible error state for a bad listId (a known,
    // separately-flagged product gap — see routes.ts) — only the console-error check
    // below is meaningful for that route.

    expect(consoleErrors, `console errors on ${route.name}:\n${consoleErrors.join("\n")}`).toEqual([]);
  });
}
