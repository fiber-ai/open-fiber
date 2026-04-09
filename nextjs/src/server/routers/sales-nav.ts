import { z } from "zod";
import { createTRPCRouter, protectedProcedure, fiberFetch } from "../trpc";

/**
 * Sales Navigator endpoints are not yet in the @fiberai/sdk.
 * Using fiberFetch() for direct API calls. When the SDK adds these
 * functions, swap fiberFetch calls to SDK calls — no schema changes needed.
 */

const triggerOutputSchema = z.object({
  output: z.object({
    taskId: z.string(),
  }).passthrough(),
}).passthrough();

const pollOutputSchema = z.object({
  output: z.object({
    status: z.string(),
    results: z.array(z.record(z.unknown())).optional(),
    nextCursor: z.string().nullable().optional(),
    totalCount: z.number().nullable().optional(),
  }).passthrough(),
}).passthrough();

export const salesNavRouter = createTRPCRouter({
  generateUrl: protectedProcedure
    .input(z.object({
      filters: z.record(z.unknown()),
    }))
    .output(z.object({ output: z.record(z.unknown()) }).passthrough())
    .mutation(async ({ ctx, input }) => {
      return fiberFetch(ctx.apiKey, "POST", "/v1/sales-nav/generate-url-from-filters", {
        filters: input.filters,
      });
    }),

  triggerUrlScrape: protectedProcedure
    .input(z.object({
      salesNavUrl: z.string().min(1),
    }))
    .output(triggerOutputSchema)
    .mutation(async ({ ctx, input }) => {
      return fiberFetch(ctx.apiKey, "POST", "/v1/sales-nav/trigger-url-scrape", {
        salesNavUrl: input.salesNavUrl,
      });
    }),

  pollUrlScrape: protectedProcedure
    .input(z.object({
      taskId: z.string(),
      cursor: z.string().nullable().optional(),
      pageSize: z.number().min(1).max(100).default(25),
    }))
    .output(pollOutputSchema)
    .query(async ({ ctx, input }) => {
      return fiberFetch(ctx.apiKey, "POST", "/v1/sales-nav/poll-url-scrape", {
        taskId: input.taskId,
        cursor: input.cursor,
        pageSize: input.pageSize,
      });
    }),

  triggerIdScrape: protectedProcedure
    .input(z.object({
      salesNavIds: z.array(z.string()).min(1),
    }))
    .output(triggerOutputSchema)
    .mutation(async ({ ctx, input }) => {
      return fiberFetch(ctx.apiKey, "POST", "/v1/sales-nav/trigger-id-scrape", {
        salesNavIds: input.salesNavIds,
      });
    }),

  pollIdScrape: protectedProcedure
    .input(z.object({
      taskId: z.string(),
      cursor: z.string().nullable().optional(),
      pageSize: z.number().min(1).max(100).default(25),
    }))
    .output(pollOutputSchema)
    .query(async ({ ctx, input }) => {
      return fiberFetch(ctx.apiKey, "POST", "/v1/sales-nav/poll-id-scrape", {
        taskId: input.taskId,
        cursor: input.cursor,
        pageSize: input.pageSize,
      });
    }),
});
