import { z } from "zod";
import {
  companySearch,
  companyCount,
  peopleSearch,
  peopleSearchCount,
  paginatedCombinedSearch,
  slushieRun,
  nlpSearchParse,
  jobPostingSearch,
  jobPostingSearchCount,
  companyTypeahead,
  locationTypeahead,
  combinedSearchCount,
} from "@fiberai/sdk";
import { createTRPCRouter, protectedProcedure, callFiber } from "../trpc";
import { companySearchParamsSchema, peopleSearchParamsSchema } from "@/lib/schemas/search";

const searchResultSchema = z.object({
  output: z.object({
    data: z.array(z.record(z.unknown())),
    nextCursor: z.string().nullable().optional(),
  }).passthrough(),
}).passthrough();

const companyCountResultSchema = z.object({
  output: z.object({ count: z.number() }).passthrough(),
}).passthrough();

const peopleCountResultSchema = z.object({
  output: z.object({ totalProfilesFound: z.number() }).passthrough(),
}).passthrough();

const jobPostingCountResultSchema = z.object({
  output: z.object({ totalJobsFound: z.number() }).passthrough(),
}).passthrough();

const jobPostingResultSchema = z.object({
  output: z.object({
    data: z.array(z.object({
      job_id: z.string(),
      title: z.string().nullable().optional(),
      company_name: z.string().nullable().optional(),
      company_logo_url: z.string().nullable().optional(),
      posted_at: z.string().nullable().optional(),
      job_url: z.string().nullable().optional(),
      seniority_level: z.string().nullable().optional(),
      employment_type: z.string().nullable().optional(),
      description: z.string().nullable().optional(),
      applicant_range: z.object({ gte: z.number().nullable().optional(), lte: z.number().nullable().optional() }).nullable().optional(),
    }).passthrough()),
  }).passthrough(),
}).passthrough();

const typeaheadResultSchema = z.object({
  output: z.array(z.object({
    preferred_name: z.string().nullable().optional(),
    names: z.array(z.string()).nullable().optional(),
    domains: z.array(z.string()).nullable().optional(),
    linkedin_primary_slug: z.string().nullable().optional(),
  }).passthrough()),
}).passthrough();

const locationTypeaheadResultSchema = z.object({
  output: z.object({
    data: z.array(z.object({
      name: z.string().nullable().optional(),
      address: z.string().nullable().optional(),
      latitude: z.number(),
      longitude: z.number(),
    }).passthrough()),
  }).passthrough(),
}).passthrough();

export const searchRouter = createTRPCRouter({
  // --- Company Search ---
  companySearch: protectedProcedure
    .input(
      z.object({
        searchParams: companySearchParamsSchema,
        pageSize: z.number().min(1).max(100).default(25),
        cursor: z.string().nullable().optional(),
        companyExclusionListIDs: z.array(z.string()).optional(),
      })
    )
    .output(searchResultSchema)
    .mutation(async ({ ctx, input }) => {
      return callFiber(() =>
        companySearch({
          body: {
            apiKey: ctx.apiKey,
            searchParams: input.searchParams as Record<string, unknown>,
            pageSize: input.pageSize,
            companyExclusionListIDs: input.companyExclusionListIDs,
            cursor: input.cursor ?? null,
          },
        })
      );
    }),

  companyCount: protectedProcedure
    .input(z.object({ searchParams: companySearchParamsSchema }))
    .output(companyCountResultSchema)
    .query(async ({ ctx, input }) => {
      return callFiber(() =>
        companyCount({
          body: {
            apiKey: ctx.apiKey,
            searchParams: input.searchParams as Record<string, unknown>,
          },
        })
      );
    }),

  // --- People Search ---
  peopleSearch: protectedProcedure
    .input(
      z.object({
        searchParams: peopleSearchParamsSchema,
        pageSize: z.number().min(1).max(100).default(25),
        cursor: z.string().nullable().optional(),
        prospectExclusionListIDs: z.array(z.string()).optional(),
        companyExclusionListIDs: z.array(z.string()).optional(),
      })
    )
    .output(searchResultSchema)
    .mutation(async ({ ctx, input }) => {
      return callFiber(() =>
        peopleSearch({
          body: {
            apiKey: ctx.apiKey,
            searchParams: input.searchParams as Record<string, unknown>,
            pageSize: input.pageSize,
            cursor: input.cursor ?? null,
            prospectExclusionListIDs: input.prospectExclusionListIDs,
            companyExclusionListIDs: input.companyExclusionListIDs,
          },
        })
      );
    }),

  peopleSearchCount: protectedProcedure
    .input(z.object({ searchParams: peopleSearchParamsSchema }))
    .output(peopleCountResultSchema)
    .query(async ({ ctx, input }) => {
      return callFiber(() =>
        peopleSearchCount({
          body: {
            apiKey: ctx.apiKey,
            searchParams: input.searchParams as Record<string, unknown>,
          },
        })
      );
    }),

  // --- Combined Search (synchronous, paginated) ---
  combinedSearch: protectedProcedure
    .input(
      z.object({
        companyParams: companySearchParamsSchema,
        profileParams: peopleSearchParamsSchema.optional(),
        companyPageSize: z.number().int().min(1).max(100).default(25),
        profilePageSize: z.number().int().min(1).max(100).default(25),
        companyCursor: z.string().nullable().optional(),
        profileCursor: z.string().nullable().optional(),
      })
    )
    .output(
      z.object({
        output: z.object({
          companies: z.array(z.record(z.unknown())),
          profiles: z.array(z.record(z.unknown())),
          nextCompaniesCursor: z.string().nullable().optional(),
          nextProfilesCursor: z.string().nullable().optional(),
        }).passthrough(),
      }).passthrough()
    )
    .mutation(async ({ ctx, input }) => {
      return callFiber(() =>
        paginatedCombinedSearch({
          body: {
            apiKey: ctx.apiKey,
            companyConfig: {
              searchParams: input.companyParams as Record<string, unknown>,
              pageSize: input.companyPageSize,
              companyCursor: input.companyCursor ?? null,
            },
            profileConfig: {
              searchParams: (input.profileParams ?? {}) as Record<string, unknown>,
              pageSize: input.profilePageSize,
              profileCursor: input.profileCursor ?? null,
            },
          },
        })
      );
    }),

  // --- AI / Natural Language Search (Slushie) ---
  // Infers whether to return companies or people from the query.
  nlSearch: protectedProcedure
    .input(
      z.object({
        query: z.string().trim().min(1),
        pageSize: z.number().int().min(1).max(100).default(25),
        pageToken: z.string().nullable().optional(),
      })
    )
    .output(
      z.object({
        output: z.object({
          searchId: z.string(),
          nextPageToken: z.string().nullable().optional(),
          results: z.record(z.unknown()),
          parsedParams: z.record(z.unknown()).nullable().optional(),
        }).passthrough(),
      }).passthrough()
    )
    .mutation(async ({ ctx, input }) => {
      return callFiber(() =>
        slushieRun({
          body: {
            apiKey: ctx.apiKey,
            query: input.query,
            pageSize: input.pageSize,
            pageToken: input.pageToken ?? null,
          },
        })
      );
    }),

  // Parse a natural-language query into structured filters (no search executed).
  nlParseParams: protectedProcedure
    .input(z.object({ query: z.string().trim().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return callFiber(() =>
        nlpSearchParse({ body: { apiKey: ctx.apiKey, query: input.query } })
      );
    }),

  // --- Job Posting Search ---
  jobPostingSearch: protectedProcedure
    .input(z.object({
      searchParams: z.record(z.unknown()).default({}),
      pageSize: z.number().min(1).max(100).default(25),
      cursor: z.string().nullable().optional(),
    }))
    .output(jobPostingResultSchema)
    .mutation(async ({ ctx, input }) => {
      return callFiber(() =>
        jobPostingSearch({ body: { apiKey: ctx.apiKey, searchParams: input.searchParams, pageSize: input.pageSize, cursor: input.cursor ?? null } })
      );
    }),

  jobPostingSearchCount: protectedProcedure
    .input(z.object({ searchParams: z.record(z.unknown()).default({}) }))
    .output(jobPostingCountResultSchema)
    .query(async ({ ctx, input }) => {
      return callFiber(() =>
        jobPostingSearchCount({ body: { apiKey: ctx.apiKey, searchParams: input.searchParams } })
      );
    }),

  // --- Combined Search Count ---
  combinedSearchCount: protectedProcedure
    .input(z.object({
      companySearchParams: companySearchParamsSchema,
      prospectSearchParams: peopleSearchParamsSchema.optional(),
    }))
    .output(z.object({ output: z.record(z.unknown()) }).passthrough())
    .mutation(async ({ ctx, input }) => {
      return callFiber(() => combinedSearchCount({
        body: {
          apiKey: ctx.apiKey,
          companyParams: input.companySearchParams as Record<string, unknown>,
          profileParams: (input.prospectSearchParams ?? {}) as Record<string, unknown>,
        },
      }));
    }),

  // --- Typeahead ---
  companyTypeahead: protectedProcedure
    .input(z.object({ startsWith: z.string().min(1), orgType: z.enum(["investor", "school"]).nullable().optional() }))
    .output(typeaheadResultSchema)
    .query(async ({ ctx, input }) => {
      return callFiber(() =>
        companyTypeahead({ body: { apiKey: ctx.apiKey, startsWith: input.startsWith, orgType: input.orgType ?? null } })
      );
    }),

  locationTypeahead: protectedProcedure
    .input(z.object({ query: z.string().min(1) }))
    .output(locationTypeaheadResultSchema)
    .query(async ({ ctx, input }) => {
      return callFiber(() =>
        locationTypeahead({ body: { apiKey: ctx.apiKey, query: input.query } })
      );
    }),
});
