import { z } from "zod";
import {
  companySearch,
  companyCount,
  peopleSearch,
  peopleSearchCount,
  combinedSearch,
  pollCombinedSearch,
  textToCompanySearch,
  textToProfileSearch,
  textToCompanySearchParams,
  textToProfileSearchParams,
  textToCombinedSearch,
  investorSearch,
  investmentSearch,
  jobPostingSearch,
  jobPostingSearchCount,
  companyTypeahead,
  locationTypeahead,
} from "@fiberai/sdk";
import { createTRPCRouter, protectedProcedure, callFiber, fiberFetch } from "../trpc";
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

const investorResultSchema = z.object({
  output: z.object({
    investors: z.array(z.object({
      name: z.string().nullable().optional(),
      totalInvestmentCount: z.number(),
      leadInvestmentCount: z.number(),
      leadInvestmentRate: z.number(),
      lastInvestmentDate: z.string().nullable().optional(),
      type: z.string().nullable().optional(),
      isTopVc: z.boolean().nullable().optional(),
      domain: z.string().nullable().optional(),
      countryCode: z.string().nullable().optional(),
    }).passthrough()),
  }).passthrough(),
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

  // --- Combined Search ---
  startCombinedSearch: protectedProcedure
    .input(
      z.object({
        companyParams: companySearchParamsSchema,
        profileParams: peopleSearchParamsSchema.optional(),
      })
    )
    .output(z.object({ output: z.object({ searchID: z.string() }).passthrough() }).passthrough())
    .mutation(async ({ ctx, input }) => {
      return callFiber(() =>
        combinedSearch({
          body: {
            apiKey: ctx.apiKey,
            companyParams: input.companyParams as Record<string, unknown>,
            profileParams: (input.profileParams ?? {}) as Record<string, unknown>,
          },
        })
      );
    }),

  pollCombinedSearch: protectedProcedure
    .input(
      z.object({
        searchId: z.string(),
        entityType: z.enum(["company", "profile"]),
        cursor: z.string().nullable().optional(),
        pageSize: z.number().min(1).max(100).default(25),
      })
    )
    .output(z.object({
      output: z.object({
        status: z.string().optional(),
        data: z.object({ type: z.string().optional(), items: z.array(z.record(z.unknown())).optional() }).passthrough().optional(),
        nextCursor: z.string().nullable().optional(),
      }).passthrough(),
    }).passthrough())
    .query(async ({ ctx, input }) => {
      return callFiber(() =>
        pollCombinedSearch({
          body: {
            apiKey: ctx.apiKey,
            searchId: input.searchId,
            entityType: input.entityType,
            cursor: input.cursor ?? null,
            pageSize: input.pageSize,
          },
        })
      );
    }),

  // --- AI / Natural Language Search ---
  textToCompanySearch: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1),
        pageSize: z.number().min(1).max(100).default(25),
        cursor: z.string().nullable().optional(),
      })
    )
    .output(searchResultSchema)
    .mutation(async ({ ctx, input }) => {
      return callFiber(() =>
        textToCompanySearch({
          body: {
            apiKey: ctx.apiKey,
            query: input.query,
            pageSize: input.pageSize,
            cursor: input.cursor ?? null,
          },
        })
      );
    }),

  textToProfileSearch: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1),
        pageSize: z.number().min(1).max(100).default(25),
        cursor: z.string().nullable().optional(),
      })
    )
    .output(searchResultSchema)
    .mutation(async ({ ctx, input }) => {
      return callFiber(() =>
        textToProfileSearch({
          body: {
            apiKey: ctx.apiKey,
            query: input.query,
            pageSize: input.pageSize,
            cursor: input.cursor ?? null,
          },
        })
      );
    }),

  textToCompanySearchParams: protectedProcedure
    .input(z.object({ query: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return callFiber(() =>
        textToCompanySearchParams({
          body: {
            apiKey: ctx.apiKey,
            query: input.query,
          },
        })
      );
    }),

  textToProfileSearchParams: protectedProcedure
    .input(z.object({ query: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return callFiber(() =>
        textToProfileSearchParams({
          body: { apiKey: ctx.apiKey, query: input.query },
        })
      );
    }),

  // --- Investor & Investment Search ---
  investorSearch: protectedProcedure
    .input(z.object({
      searchParams: z.record(z.unknown()).default({}),
      pageSize: z.number().min(1).max(100).default(25),
      cursor: z.string().nullable().optional(),
    }))
    .output(investorResultSchema)
    .mutation(async ({ ctx, input }) => {
      return callFiber(() =>
        investorSearch({ body: { apiKey: ctx.apiKey, searchParams: input.searchParams, pageSize: input.pageSize, cursor: input.cursor ?? null } })
      );
    }),

  investmentSearch: protectedProcedure
    .input(z.object({
      searchParams: z.record(z.unknown()).default({}),
      pageSize: z.number().min(1).max(100).default(25),
      cursor: z.string().nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return callFiber(() =>
        investmentSearch({ body: { apiKey: ctx.apiKey, searchParams: input.searchParams, pageSize: input.pageSize, cursor: input.cursor ?? null } })
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

  // --- Job Description → People ---
  // Not yet in @fiberai/sdk v0.0.5 — using fiberFetch
  jdToProfileSearch: protectedProcedure
    .input(
      z.discriminatedUnion("request", [
        z.object({
          request: z.literal("initial"),
          query: z.string().min(1),
          pageSize: z.number().min(1).max(100).default(25),
        }),
        z.object({
          request: z.literal("subsequent"),
          cursor: z.string(),
        }),
      ])
    )
    .output(searchResultSchema)
    .mutation(async ({ ctx, input }) => {
      return fiberFetch(ctx.apiKey, "POST", "/v1/natural-language-search/job-description-search", {
        search: input.request === "initial"
          ? { request: "initial", query: input.query, pageSize: input.pageSize }
          : { request: "subsequent", cursor: input.cursor },
      });
    }),

  // --- Combined Search Count ---
  combinedSearchCount: protectedProcedure
    .input(z.object({
      companySearchParams: companySearchParamsSchema,
      prospectSearchParams: peopleSearchParamsSchema.optional(),
    }))
    .output(z.object({ output: z.record(z.unknown()) }).passthrough())
    .mutation(async ({ ctx, input }) => {
      return fiberFetch(ctx.apiKey, "POST", "/v1/combined-search/count", {
        companySearchParams: input.companySearchParams,
        prospectSearchParams: input.prospectSearchParams ?? {},
      });
    }),

  // --- Text-to-Combined Search ---
  textToCombinedSearch: protectedProcedure
    .input(z.object({
      query: z.string().min(1),
      companyItemLimit: z.number().min(0).max(100).default(25),
      profileItemLimit: z.number().min(1).max(100).default(25),
    }))
    .output(z.object({ output: z.record(z.unknown()) }).passthrough())
    .mutation(async ({ ctx, input }) => {
      return callFiber(() =>
        textToCombinedSearch({
          body: {
            apiKey: ctx.apiKey,
            query: input.query,
            companyItemLimit: input.companyItemLimit,
            profileItemLimit: input.profileItemLimit,
          },
        })
      );
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
