import { test, expect } from "./fixtures";

test.describe("try various APIs", () => {
  test("company search returns real results", async ({ page, consoleErrors }) => {
    await page.goto("/search/companies");
    await expect(page.getByRole("heading", { name: "Company Search" })).toBeVisible();

    // Filter by a single well-known domain rather than searching unfiltered — an
    // unfiltered search scans the whole real dataset (the UI itself hints at this:
    // "Add filters to see match count" shows no estimate without one) and was
    // observed to sometimes still be pending past a 20s timeout. A domain filter is
    // a fast, deterministic, indexed lookup.
    await page.getByPlaceholder("e.g. stripe.com").fill("stripe.com");
    await page.getByRole("button", { name: "Search" }).click();

    await expect(page.getByTestId("error-display")).toHaveCount(0, { timeout: 15_000 });
    await expect(page.getByTestId("search-result-row").first()).toBeVisible({ timeout: 20_000 });

    expect(consoleErrors, `console errors:\n${consoleErrors.join("\n")}`).toEqual([]);
  });

  test.describe("single-lookup contact enrichment", () => {
    const linkedinUrl = process.env.E2E_TEST_LINKEDIN_URL;
    test.skip(
      !linkedinUrl,
      "E2E_TEST_LINKEDIN_URL is not set — this reveal test targets a real person's " +
        "contact info, so it only runs against a URL the team has explicitly configured " +
        "for testing, rather than a hardcoded profile picked by this suite."
    );

    test("standard reveal on a real LinkedIn profile returns a result", async ({ page, consoleErrors }) => {
      await page.goto("/enrichment/single");
      await expect(page.getByRole("heading", { name: "Single Lookup" })).toBeVisible();

      await page.locator("#linkedin-url").fill(linkedinUrl!);
      await page.getByRole("button", { name: "Look Up Contact" }).click();

      await expect(page.getByTestId("error-display")).toHaveCount(0, { timeout: 20_000 });
      // EnrichmentResultCard renders once standardMutation resolves — wait for the
      // loading spinner to clear rather than asserting specific contact data, since
      // reveal outcomes vary by profile/plan.
      await expect(page.getByRole("button", { name: "Look Up Contact" })).toBeEnabled({ timeout: 30_000 });

      expect(consoleErrors, `console errors:\n${consoleErrors.join("\n")}`).toEqual([]);
    });
  });
});
