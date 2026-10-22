import { z } from "zod";
import { listCompanyRankings } from "@fiberai/sdk";
import { createTRPCRouter, protectedProcedure, callFiber } from "../trpc";

export const companyRankingsRouter = createTRPCRouter({
  /** Fortune 500 / Forbes Global 2000 edition, optionally limited to a rank range. 1 credit per company returned. */
  list: protectedProcedure
    .input(z.object({
      list: z.enum(["fortune-500-usa", "forbes-global-2000"]),
      year: z.number().int().min(1990).max(2100).nullable().optional(),
      low: z.number().int().min(1),
      high: z.number().int().min(1),
    }).refine((v) => v.high >= v.low, "End rank must be ≥ start rank"))
    .output(z.object({
      output: z.object({
        list: z.string(),
        year: z.number(),
        companies: z.array(z.object({
          name: z.string(),
          rank: z.number(),
          domain: z.string().nullable().optional(),
          ticker: z.string().nullable().optional(),
          headquarters: z.string().nullable().optional(),
          countryCode: z.string().nullable().optional(),
          revenueUsd: z.number().nullable().optional(),
          profitsUsd: z.number().nullable().optional(),
          marketCapUsd: z.number().nullable().optional(),
          employeeCount: z.number().nullable().optional(),
        }).passthrough()),
      }).passthrough(),
    }).passthrough())
    .mutation(async ({ ctx, input }) => {
      return callFiber(() => listCompanyRankings({
        body: { apiKey: ctx.apiKey, rankings: { list: input.list, year: input.year ?? null, rankRange: { low: input.low, high: input.high } } },
      }));
    }),
});
