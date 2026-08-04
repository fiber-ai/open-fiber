import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { Context } from "./context";

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.apiKey) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Please connect your Fiber API key to continue.",
    });
  }
  return next({ ctx: { ...ctx, apiKey: ctx.apiKey } });
});

// The backend returns 403 for several unrelated things — an actually-invalid API key,
// but also route-tag restrictions ("You cannot access this route!") and per-resource
// ownership checks ("Access denied to this saved search run", etc). Only the messages
// below indicate the key itself doesn't resolve to an org; everything else is a 403 the
// key holder is legitimately not allowed to do, and must NOT clear their session.
const INVALID_KEY_MESSAGES = new Set(["Invalid API key provided!"]);

function mapFiberStatusToTRPCCode(status: number, message: string): TRPCError["code"] {
  if (status === 401) return "UNAUTHORIZED";
  if (status === 403) return INVALID_KEY_MESSAGES.has(message) ? "UNAUTHORIZED" : "FORBIDDEN";
  if (status === 402) return "FORBIDDEN";
  if (status === 404) return "NOT_FOUND";
  if (status === 400 || status === 422) return "BAD_REQUEST";
  if (status === 429) return "TOO_MANY_REQUESTS";
  return "INTERNAL_SERVER_ERROR";
}

export async function callFiber<T>(
  fn: () => Promise<{ data?: T; error?: unknown; response?: { status?: number } }>
): Promise<T> {
  const result = await fn();

  if (result.error) {
    const err = result.error as { status?: number; message?: string; detail?: string };
    // The SDK carries the HTTP status on `response.status`; the error body rarely
    // includes it. Prefer response.status so 401/402/429 map correctly.
    const status = result.response?.status ?? err.status ?? 500;
    const message = err.message ?? err.detail ?? "Fiber API error";
    const code = mapFiberStatusToTRPCCode(status, message);

    throw new TRPCError({ code, message, cause: result.error });
  }

  return result.data as T;
}

/**
 * Make a direct HTTP call to the Fiber API for endpoints not yet in the SDK.
 * Returns parsed JSON directly. Throws a TRPCError on non-OK responses or
 * when the response body cannot be parsed as JSON.
 */
export async function fiberFetch<T>(
  apiKey: string,
  method: "GET" | "POST" | "DELETE",
  path: string,
  body?: Record<string, unknown>
): Promise<T> {
  const url = `https://api.fiber.ai${path}`;
  // Always include apiKey in the body for POST requests (Fiber API convention).
  // Also send it via x-api-key header as a fallback for GET/DELETE.
  const bodyWithKey = body ? { apiKey, ...body } : { apiKey };
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    ...(method !== "GET" ? { body: JSON.stringify(bodyWithKey) } : {}),
  });

  const rawText = await res.text();
  let data: unknown;
  try {
    data = JSON.parse(rawText);
  } catch {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Fiber API returned non-JSON response: ${rawText.slice(0, 200)}`,
    });
  }

  if (!res.ok) {
    const status = res.status;
    const obj = data as Record<string, unknown> | undefined;
    const message = (obj?.message ?? obj?.detail ?? "Fiber API error") as string;
    const code = mapFiberStatusToTRPCCode(status, message);

    throw new TRPCError({ code, message, cause: data });
  }

  return data as T;
}

/**
 * Extract lowCreditAlert from any Fiber API response's chargeInfo.
 * Returns null if no alert present.
 */
export function extractLowCreditAlert(data: unknown): {
  message: string;
  availableCredits: number;
  getMoreCreditsUrl: string;
} | null {
  if (!data || typeof data !== "object") return null;
  const obj = data as Record<string, unknown>;
  const chargeInfo = obj.chargeInfo as Record<string, unknown> | undefined;
  if (!chargeInfo) return null;
  const alert = chargeInfo.lowCreditAlert as Record<string, unknown> | null | undefined;
  if (!alert) return null;
  return {
    message: (alert.message as string) ?? "Credits are running low",
    availableCredits: (alert.availableCredits as number) ?? 0,
    getMoreCreditsUrl: (alert.getMoreCreditsUrl as string) ?? "https://fiber.ai/app/api",
  };
}
