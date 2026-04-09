import { z } from "zod";
import {
  createSavedSearch,
  listSavedSearch,
  getSavedSearch,
  updateSavedSearch,
  manuallySpawnSavedSearchRun,
  getSavedSearchRunStatus,
  getSavedSearchRunCompanies,
  getSavedSearchRunProfiles,
  listSavedSearchRuns,
  getLatestSavedSearchRun,
  getSavedSearchRun,
  getCurrentCompaniesInSavedSearch,
  getCurrentProfilesInSavedSearch,
} from "@fiberai/sdk";
import { createTRPCRouter, protectedProcedure, callFiber } from "../trpc";
import { companySearchParamsSchema, peopleSearchParamsSchema } from "@/lib/schemas/search";

// --- Output schemas ---
// .passthrough()'d so the frontend remains forward-compatible if the API adds fields.

const paginatedCompaniesSchema = z.object({
  output: z.object({
    companies: z.array(z.record(z.unknown())),
    nextCursor: z.string().nullable().optional(),
    totalCount: z.number().nullable().optional(),
  }).passthrough(),
}).passthrough();

const paginatedProfilesSchema = z.object({
  output: z.object({
    profiles: z.array(z.record(z.unknown())),
    nextCursor: z.string().nullable().optional(),
    totalCount: z.number().nullable().optional(),
  }).passthrough(),
}).passthrough();

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

  // --- Newly wired endpoints (Phase B) ---

  update: protectedProcedure
    .input(
      z.object({
        savedSearchId: z.string(),
        name: z.string().min(1).optional(),
        spawnFrequencyDays: z.number().min(7).optional(),
        companySearchParams: companySearchParamsSchema.optional(),
        prospectSearchParams: peopleSearchParamsSchema.optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return callFiber(() =>
        updateSavedSearch({
          body: {
            apiKey: ctx.apiKey,
            id: input.savedSearchId,
            ...(input.name ? { name: input.name } : {}),
            ...(input.spawnFrequencyDays ? { spawnFrequencyDays: input.spawnFrequencyDays } : {}),
            ...(input.companySearchParams
              ? { companyParams: input.companySearchParams as Record<string, unknown> }
              : {}),
            ...(input.prospectSearchParams
              ? { prospectParams: input.prospectSearchParams as Record<string, unknown> }
              : {}),
          },
        })
      );
    }),

  listRuns: protectedProcedure
    .input(
      z.object({
        savedSearchId: z.string(),
        cursor: z.string().nullable().optional(),
        pageSize: z.number().min(1).max(100).default(25),
      })
    )
    .query(async ({ ctx, input }) => {
      return callFiber(() =>
        listSavedSearchRuns({
          body: {
            apiKey: ctx.apiKey,
            savedSearchId: input.savedSearchId,
            cursor: input.cursor ?? undefined,
            pageSize: input.pageSize,
          },
        })
      );
    }),

  getLatestRun: protectedProcedure
    .input(z.object({ savedSearchId: z.string() }))
    .query(async ({ ctx, input }) => {
      return callFiber(() =>
        getLatestSavedSearchRun({
          body: {
            apiKey: ctx.apiKey,
            savedSearchId: input.savedSearchId,
          },
        })
      );
    }),

  getRun: protectedProcedure
    .input(z.object({ savedSearchRunId: z.string() }))
    .query(async ({ ctx, input }) => {
      return callFiber(() =>
        getSavedSearchRun({
          body: {
            apiKey: ctx.apiKey,
            savedSearchRunId: input.savedSearchRunId,
          },
        })
      );
    }),

  getCurrentCompanies: protectedProcedure
    .input(
      z.object({
        savedSearchId: z.string(),
        cursor: z.string().nullable().optional(),
        pageSize: z.number().min(1).max(100).default(25),
      })
    )
    .output(paginatedCompaniesSchema)
    .query(async ({ ctx, input }) => {
      return callFiber(() =>
        getCurrentCompaniesInSavedSearch({
          body: {
            apiKey: ctx.apiKey,
            savedSearchId: input.savedSearchId,
            cursor: input.cursor ?? undefined,
            pageSize: input.pageSize,
          },
        })
      );
    }),

  getCurrentProfiles: protectedProcedure
    .input(
      z.object({
        savedSearchId: z.string(),
        cursor: z.string().nullable().optional(),
        pageSize: z.number().min(1).max(100).default(25),
      })
    )
    .output(paginatedProfilesSchema)
    .query(async ({ ctx, input }) => {
      return callFiber(() =>
        getCurrentProfilesInSavedSearch({
          body: {
            apiKey: ctx.apiKey,
            savedSearchId: input.savedSearchId,
            cursor: input.cursor ?? undefined,
            pageSize: input.pageSize,
          },
        })
      );
    }),
});
