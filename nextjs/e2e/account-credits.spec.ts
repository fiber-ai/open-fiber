import { createTRPCClient, httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import { test, expect } from "./fixtures";
import type { AppRouter } from "@/server/routers/_app";

// Regression coverage for the fa226da-class bug (fix(FIB-18660): credits/auto-topup
// array-shape breaks, same root cause as FIB-18599 "prod API key doesn't work with
// OpenFiber"): the backend's GET /v1/get-org-credits and GET /v1/auto-topup/settings
// return array-shaped `output` (one entry per subscription), which previously broke
// /account and the "/" root gate (both call trpc.utility.getCredits on every login)
// for real orgs. These assertions target exactly that failure shape.

function parseFormattedNumber(text: string): number {
  return Number(text.replace(/,/g, ""));
}

test.describe("account & credits (FIB-18599 / FIB-18660 regression coverage)", () => {
  test("root gate resolves to search, not stuck loading or bounced to setup", async ({ page, consoleErrors }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/search\/companies$/, { timeout: 15_000 });
    expect(consoleErrors, `console errors:\n${consoleErrors.join("\n")}`).toEqual([]);
  });

  test("/account renders the data state with valid figures, not the error state", async ({
    page,
    consoleErrors,
    toastEvents,
  }) => {
    await page.goto("/account");
    await expect(page.getByRole("heading", { name: "Usage & Credits" })).toBeVisible();

    // Assertion 2: data state, not error state.
    await expect(page.getByTestId("error-display")).toHaveCount(0, { timeout: 15_000 });

    const availableEl = page.getByTestId("credits-available");
    const usedEl = page.getByTestId("credits-used");
    const resetsOnEl = page.getByTestId("credits-resets-on");
    await expect(availableEl).toBeVisible({ timeout: 15_000 });
    await expect(usedEl).toBeVisible();
    await expect(resetsOnEl).toBeVisible();

    // Assertion 3: credits are finite numbers, not NaN/undefined — this is the exact
    // failure mode when code expects a single object but receives an array (or a
    // property lookup on an array silently yields `undefined`).
    const available = parseFormattedNumber((await availableEl.textContent()) ?? "");
    const used = parseFormattedNumber((await usedEl.textContent()) ?? "");
    expect(Number.isFinite(available), `available credits not finite: "${await availableEl.textContent()}"`).toBe(true);
    expect(Number.isFinite(used), `used credits not finite: "${await usedEl.textContent()}"`).toBe(true);

    // Assertion 4: "Resets On" renders a real date, not "Invalid Date".
    const resetsOnText = (await resetsOnEl.textContent()) ?? "";
    expect(resetsOnText).not.toContain("Invalid Date");

    // Assertion 7: BillingSettings (auto top-up) degrading must not blank the whole
    // page — the credits cards above must still be fully rendered regardless of
    // whether the Auto Top-Up section renders, errors, or is absent.
    await expect(availableEl).toBeVisible();

    // Assertion 5: no destructive toast (handleGlobalError's UNAUTHORIZED/FORBIDDEN
    // paths misfiring on an unparseable response) during the page's data-fetch
    // lifecycle.
    await page.waitForLoadState("networkidle");
    const destructiveToasts = toastEvents.filter((t) => t.variant === "destructive");
    expect(destructiveToasts, `unexpected destructive toasts: ${JSON.stringify(destructiveToasts)}`).toEqual([]);

    // Assertion 6: no console errors / unhandled exceptions — what would have caught
    // a raw TypeError from an object-vs-array shape mismatch.
    expect(consoleErrors, `console errors:\n${consoleErrors.join("\n")}`).toEqual([]);
  });

  test("HTTP-level contract check: utility.getCredits output is an object, not an array", async () => {
    const apiKey = process.env.E2E_FIBER_API_KEY;
    test.skip(!apiKey, "E2E_FIBER_API_KEY is not set");

    const port = process.env.PORT ?? "3000";
    const client = createTRPCClient<AppRouter>({
      links: [
        httpBatchLink({
          url: `http://localhost:${port}/api/trpc`,
          transformer: superjson,
          headers: () => ({ Cookie: `fiber-api-key=${encodeURIComponent(apiKey!)}` }),
        }),
      ],
    });

    const result = await client.utility.getCredits.query();
    const output = result.output as Record<string, unknown>;

    expect(Array.isArray(output), "utility.getCredits output must be a single object, not an array").toBe(false);
    expect(typeof output.available).toBe("number");
    expect(typeof output.used).toBe("number");
    expect(typeof output.max).toBe("number");
  });
});
