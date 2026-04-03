import { z } from "zod";
import {
  createSavedSearch,
  listSavedSearch,
  getSavedSearch,
  manuallySpawnSavedSearchRun,
  getSavedSearchRunStatus,
  getSavedSearchRunCompanies,
  getSavedSearchRunProfiles,
} from "@fiberai/sdk";
import { createTRPCRouter, protectedProcedure, callFiber } from "../trpc";
import { companySearchParamsSchema, peopleSearchParamsSchema } from "@/lib/schemas/search";

export const savedSearchRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        companySearchParams: companySearchParamsSchema,
        prospectSearchParams: peopleSearchParamsSchema.optional(),
        spawnFrequencyDays: z.number().min(1).default(7),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return callFiber(() =>
        createSavedSearch({
          body: {
            apiKey: ctx.apiKey,
            name: input.name,
            spawnFrequencyDays: input.spawnFrequencyDays,
            searchParams: {
              type: "combined" as const,
              companySearchParams: input.companySearchParams as Record<string, unknown>,
              profileSearchParams: (input.prospectSearchParams ?? {}) as Record<string, unknown>,
            },
          },
        })
      );
    }),

  list: protectedProcedure
    .input(
      z.object({
        cursor: z.string().nullable().optional(),
        pageSize: z.number().min(1).max(100).default(25),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      return callFiber(() =>
        listSavedSearch({
          body: {
            apiKey: ctx.apiKey,
            cursor: input?.cursor ?? undefined,
            pageSize: input?.pageSize ?? 25,
          },
        })
      );
    }),

  get: protectedProcedure
    .input(z.object({ savedSearchId: z.string() }))
    .query(async ({ ctx, input }) => {
      return callFiber(() =>
        getSavedSearch({
          body: {
            apiKey: ctx.apiKey,
            savedSearchId: input.savedSearchId,
          },
        })
      );
    }),

  spawnRun: protectedProcedure
    .input(z.object({ savedSearchId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return callFiber(() =>
        manuallySpawnSavedSearchRun({
          body: {
            apiKey: ctx.apiKey,
            savedSearchId: input.savedSearchId,
          },
        })
      );
    }),

  getRunStatus: protectedProcedure
    .input(z.object({ savedSearchRunId: z.string() }))
    .query(async ({ ctx, input }) => {
      return callFiber(() =>
        getSavedSearchRunStatus({
          body: {
            apiKey: ctx.apiKey,
            savedSearchRunId: input.savedSearchRunId,
          },
        })
      );
    }),

  getRunCompanies: protectedProcedure
    .input(
      z.object({
        savedSearchRunId: z.string(),
        statuses: z.array(z.enum(["joined", "returned", "departed", "stayed"])).optional(),
        cursor: z.string().nullable().optional(),
        pageSize: z.number().min(1).max(100).default(25),
      })
    )
    .query(async ({ ctx, input }) => {
      return callFiber(() =>
        getSavedSearchRunCompanies({
          body: {
            apiKey: ctx.apiKey,
            savedSearchRunId: input.savedSearchRunId,
            statuses: input.statuses,
            cursor: input.cursor ?? undefined,
            pageSize: input.pageSize,
          },
        })
      );
    }),

  getRunProfiles: protectedProcedure
    .input(
      z.object({
        savedSearchRunId: z.string(),
        statuses: z.array(z.enum(["joined", "returned", "departed", "stayed"])).optional(),
        cursor: z.string().nullable().optional(),
        pageSize: z.number().min(1).max(100).default(25),
      })
    )
    .query(async ({ ctx, input }) => {
      return callFiber(() =>
        getSavedSearchRunProfiles({
          body: {
            apiKey: ctx.apiKey,
            savedSearchRunId: input.savedSearchRunId,
            statuses: input.statuses,
            cursor: input.cursor ?? undefined,
            pageSize: input.pageSize,
          },
        })
      );
    }),
});
