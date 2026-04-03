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
