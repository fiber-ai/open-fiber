import { z } from "zod";
import { listApiRequests, downloadApiRequests } from "@fiberai/sdk";
import { createTRPCRouter, protectedProcedure, callFiber } from "../trpc";

const filters = z.object({
  from: z.string().datetime().nullable().optional(),
  to: z.string().datetime().nullable().optional(),
  routePath: z.string().trim().nullable().optional(),
  method: z.string().trim().nullable().optional(),
  statusCode: z.number().int().min(100).max(599).nullable().optional(),
  errorCode: z.string().trim().nullable().optional(),
});

const requestRow = z.object({
  id: z.string(),
  createdAt: z.string(),
  method: z.string(),
  routePath: z.string(),
  statusCode: z.number(),
  durationMs: z.number().nullable().optional(),
  errorCode: z.string().nullable().optional(),
  request: z.unknown().optional(),
}).passthrough();

const SECRET_KEYS = new Set(["apikey", "api_key", "x-api-key", "authorization"]);

/** Never send the raw API key back to the browser, even though it's the caller's own. */
function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, v]) => [
      k, SECRET_KEYS.has(k.toLowerCase()) && typeof v === "string" ? `${v.slice(0, 6)}…` : redact(v),
    ]));
  }
  return value;
}

const clean = (f: z.infer<typeof filters>) => ({
  from: f.from || null,
  to: f.to || null,
  routePath: f.routePath || null,
  method: f.method || null,
  statusCode: f.statusCode ?? null,
  errorCode: f.errorCode || null,
});

export const apiRequestsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(filters.extend({
      cursor: z.string().nullable().optional(),
      pageSize: z.number().int().min(1).max(200).default(50),
    }))
    .output(z.object({
      output: z.object({
        apiRequests: z.array(requestRow),
        nextCursor: z.string().nullable().optional(),
        hasMore: z.boolean(),
        retentionDays: z.number(),
      }).passthrough(),
    }).passthrough())
    .query(async ({ ctx, input }) => {
      const res = await callFiber(() => listApiRequests({
        body: { apiKey: ctx.apiKey, ...clean(input), cursor: input.cursor ?? null, pageSize: input.pageSize },
      }));
      return { ...res, output: { ...res.output, apiRequests: res.output.apiRequests.map((r) => ({ ...r, request: redact(r.request) })) } };
    }),

  download: protectedProcedure
    .input(filters)
    .output(z.object({
      output: z.object({
        apiRequests: z.array(requestRow),
        truncated: z.boolean(),
        retentionDays: z.number(),
      }).passthrough(),
    }).passthrough())
    .mutation(async ({ ctx, input }) => {
      const res = await callFiber(() => downloadApiRequests({ body: { apiKey: ctx.apiKey, ...clean(input) } }));
      return { ...res, output: { ...res.output, apiRequests: res.output.apiRequests.map((r) => ({ ...r, request: redact(r.request) })) } };
    }),
});
