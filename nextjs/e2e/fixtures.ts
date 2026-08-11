import { test as base, expect } from "@playwright/test";

export interface ToastEvent {
  title: string;
  description: string;
  variant: "default" | "destructive";
}

interface Fixtures {
  /** Console `error` messages and uncaught page exceptions observed during the test. */
  consoleErrors: string[];
  /** `fiber-toast` CustomEvents dispatched by src/lib/trpc.ts's showToast(). */
  toastEvents: ToastEvent[];
}

export const test = base.extend<Fixtures>({
  consoleErrors: async ({ page }, use) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    page.on("pageerror", (err) => {
      errors.push(err.message);
    });
    await use(errors);
  },

  toastEvents: async ({ page }, use) => {
    const events: ToastEvent[] = [];
    await page.exposeFunction("__e2eOnToast", (evt: ToastEvent) => {
      events.push(evt);
    });
    await page.addInitScript(() => {
      window.addEventListener("fiber-toast", (e) => {
        // @ts-expect-error __e2eOnToast is injected via page.exposeFunction above
        window.__e2eOnToast((e as CustomEvent).detail);
      });
    });
    await use(events);
  },
});

export { expect };
