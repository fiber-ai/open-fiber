import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const PORT = process.env.PORT ?? "3000";
const BASE_URL = `http://localhost:${PORT}`;
const STORAGE_STATE_PATH = path.join(__dirname, ".auth", "storageState.json");
const COOKIE_NAME = "fiber-api-key";

/**
 * Provisions one authenticated storageState for the whole suite by presetting the
 * fiber-api-key cookie directly (see src/lib/api-key.ts) rather than driving the
 * /setup UI on every spec. HttpOnly only blocks page-JS access, not Playwright's
 * CDP-level cookie API, so this works. auth.spec.ts is the one spec that exercises
 * the real /setup login flow end-to-end instead of reusing this storageState.
 */
export default async function globalSetup() {
  const apiKey = process.env.E2E_FIBER_API_KEY;
  if (!apiKey) {
    throw new Error(
      "E2E_FIBER_API_KEY is not set. The E2E suite needs a real, pre-provisioned " +
        "Fiber API key (sk_live_...) to authenticate against the live backend — " +
        "set it in your local .env or as the E2E_FIBER_API_KEY CI secret."
    );
  }

  fs.mkdirSync(path.dirname(STORAGE_STATE_PATH), { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext();

  await context.addCookies([
    {
      name: COOKIE_NAME,
      value: apiKey,
      url: BASE_URL,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);

  await context.storageState({ path: STORAGE_STATE_PATH });
  await browser.close();
}
