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
      message: "Fiber API key is required. Set FIBER_API_KEY in .env or configure it in the app.",
    });
  }
  return next({ ctx: { ...ctx, apiKey: ctx.apiKey } });
});

export async function callFiber<T>(
  fn: () => Promise<{ data?: T; error?: unknown }>
): Promise<T> {
  const result = await fn();

  if (result.error) {
    const err = result.error as { status?: number; message?: string; detail?: string };
    const status = err.status ?? 500;
    const message = err.message ?? err.detail ?? "Fiber API error";

    let code: TRPCError["code"] = "INTERNAL_SERVER_ERROR";
    if (status === 401) code = "UNAUTHORIZED";
    else if (status === 402) code = "FORBIDDEN";
    else if (status === 404) code = "NOT_FOUND";
    else if (status === 422) code = "BAD_REQUEST";
    else if (status === 429) code = "TOO_MANY_REQUESTS";

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

    let code: TRPCError["code"] = "INTERNAL_SERVER_ERROR";
    if (status === 401) code = "UNAUTHORIZED";
    else if (status === 402) code = "FORBIDDEN";
    else if (status === 404) code = "NOT_FOUND";
    else if (status === 422) code = "BAD_REQUEST";
    else if (status === 429) code = "TOO_MANY_REQUESTS";

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
