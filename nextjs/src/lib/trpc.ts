import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createTRPCNext } from "@trpc/next";
import superjson from "superjson";
import type { AppRouter } from "@/server/routers/_app";

function getBaseUrl() {
  if (typeof window !== "undefined") return "";
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:${process.env.PORT ?? 3000}`;
}

let lastLowCreditAlertTime = 0;

function checkLowCreditAlert(data: unknown) {
  if (typeof window === "undefined") return;
  if (!data || typeof data !== "object") return;

  const obj = data as Record<string, unknown>;
  const chargeInfo = obj.chargeInfo as Record<string, unknown> | undefined;
  if (!chargeInfo?.lowCreditAlert) return;

  const alert = chargeInfo.lowCreditAlert as {
    message?: string;
    availableCredits?: number;
    getMoreCreditsUrl?: string;
  };

  // Deduplicate — only show once per 60 seconds
  const now = Date.now();
  if (now - lastLowCreditAlertTime < 60_000) return;
  lastLowCreditAlertTime = now;

  showToast(
    "Low Credits",
    alert.message ?? `Only ${alert.availableCredits ?? 0} credits remaining. Add more at fiber.ai/app/api.`,
    "destructive"
  );
}

function handleGlobalError(error: unknown) {
  if (typeof window === "undefined") return;
  if (!(error instanceof TRPCClientError)) return;

  const code = error.data?.code as string | undefined;

  if (code === "UNAUTHORIZED") {
    // Clear API key cookie and redirect to setup
    fetch("/api/set-api-key", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey: "" }),
    }).then(() => {
      window.location.href = "/setup";
    });
    return;
  }

  if (code === "FORBIDDEN") {
    // Covers 402 (out of credits) as well as non-auth 403s (route/plan restrictions,
    // resource ownership) — show the backend's own message rather than assuming credits.
    showToast("Access denied", error.message || "This action isn't available for your account.", "destructive");
    return;
  }

  if (code === "TOO_MANY_REQUESTS") {
    showToast(
      "Rate limit exceeded",
      "Please wait a moment before trying again.",
      "default"
    );
    return;
  }
}

function showToast(title: string, description: string, variant: "default" | "destructive") {
  // Dispatch a custom event that the Toaster can pick up
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("fiber-toast", { detail: { title, description, variant } })
    );
  }
}

export const trpc = createTRPCNext<AppRouter>({
  config() {
    return {
      links: [
        httpBatchLink({
          url: `${getBaseUrl()}/api/trpc`,
          transformer: superjson,
        }),
      ],
      queryClientConfig: {
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: (failureCount, error) => {
              // Don't retry auth/credit/rate-limit errors
              if (error instanceof TRPCClientError) {
                const code = error.data?.code as string | undefined;
                if (["UNAUTHORIZED", "FORBIDDEN", "TOO_MANY_REQUESTS"].includes(code ?? "")) {
                  return false;
                }
              }
              return failureCount < 1;
            },
          },
          mutations: {
            onError: handleGlobalError,
            onSuccess: checkLowCreditAlert,
          },
        },
      },
    };
  },
  transformer: superjson,
  ssr: false,
});
