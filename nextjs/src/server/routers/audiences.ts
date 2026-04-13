import { z } from "zod";
import {
  createAudience, deleteAudience, listAudiences, getAudienceStatus,
  getAudienceCompanies, getAudienceProspects, buildAudience, triggerEnrichment,
  updateAudienceSearchParams, getEnrichmentStatus,
} from "@fiberai/sdk";
import { createTRPCRouter, protectedProcedure, callFiber } from "../trpc";
import { enrichmentTypeSchema } from "@/lib/schemas/enrichment";
import { companySearchParamsSchema, peopleSearchParamsSchema } from "@/lib/schemas/search";

const enrichmentStatusOutputSchema = z.object({
  output: z.object({
    enrichmentId: z.string(),
    currentStage: z.string(),
    totalProspects: z.number().nullable().optional(),
    enrichedProspects: z.number().nullable().optional(),
    failedProspects: z.number().nullable().optional(),
    percentComplete: z.number().nullable().optional(),
    completedAt: z.string().nullable().optional(),
  }).passthrough(),
}).passthrough();

const audienceItemSchema = z.object({
  audienceId: z.string(), name: z.string(), status: z.string(),
  createdAt: z.string(), companiesCount: z.number().nullable().optional(), prospectsCount: z.number().nullable().optional(),
}).passthrough();

const listOutputSchema = z.object({
  output: z.object({
    audiences: z.array(audienceItemSchema), totalCount: z.number().nullable().optional(),
  }).passthrough(),
}).passthrough();

const statusOutputSchema = z.object({
  output: z.object({
    audienceId: z.string(), name: z.string(), status: z.string(), createdAt: z.string(),
    companiesCount: z.number().nullable().optional(), prospectsCount: z.number().nullable().optional(),
    buildingStartedAt: z.string().nullable().optional(), buildingFinishedAt: z.string().nullable().optional(),
  }).passthrough(),
}).passthrough();

const companiesOutputSchema = z.object({
  output: z.object({
    audienceId: z.string(),
    companies: z.array(z.object({
      companyId: z.string(), name: z.string().nullable().optional(), domain: z.string().nullable().optional(),
      industry: z.string().nullable().optional(), headcount: z.number().nullable().optional(),
    }).passthrough()),
    totalCount: z.number(), nextCursor: z.string().nullable().optional(), hasMore: z.boolean(),
  }).passthrough(),
}).passthrough();

const prospectsOutputSchema = z.object({
  output: z.object({
    audienceId: z.string(),
    prospects: z.array(z.object({
      prospectId: z.string(), firstName: z.string().nullable().optional(), lastName: z.string().nullable().optional(),
      jobTitle: z.string().nullable().optional(), companyName: z.string().nullable().optional(), location: z.string().nullable().optional(),
    }).passthrough()),
    totalCount: z.number(), nextCursor: z.string().nullable().optional(), hasMore: z.boolean(),
  }).passthrough(),
}).passthrough();

export const audienceRouter = createTRPCRouter({
  create: protectedProcedure
    .input(z.object({ name: z.string().min(1), creationMethod: z.enum(["NORMAL", "START_FROM_PROSPECTS"]).default("NORMAL") }))
    .output(z.object({ output: z.object({ audienceId: z.string(), name: z.string(), status: z.string(), createdAt: z.string() }).passthrough() }).passthrough())
    .mutation(async ({ ctx, input }) => {
      return callFiber(() => createAudience({ body: { apiKey: ctx.apiKey, name: input.name, creationMethod: input.creationMethod } }));
    }),

  delete: protectedProcedure
    .input(z.object({ audienceId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return callFiber(() => deleteAudience({ path: { audienceId: input.audienceId }, query: { apiKey: ctx.apiKey } }));
    }),

  list: protectedProcedure
    .output(listOutputSchema)
    .query(async ({ ctx }) => {
      return callFiber(() => listAudiences({ query: { apiKey: ctx.apiKey } }));
    }),

  getStatus: protectedProcedure
    .input(z.object({ audienceId: z.string() }))
    .output(statusOutputSchema)
    .query(async ({ ctx, input }) => {
      return callFiber(() => getAudienceStatus({ path: { audienceId: input.audienceId }, query: { apiKey: ctx.apiKey } }));
    }),

  getCompanies: protectedProcedure
    .input(z.object({ audienceId: z.string(), pageSize: z.number().min(1).max(100).default(25), cursor: z.string().optional() }))
    .output(companiesOutputSchema)
    .query(async ({ ctx, input }) => {
      return callFiber(() => getAudienceCompanies({
        path: { audienceId: input.audienceId },
        query: { apiKey: ctx.apiKey, pageSize: input.pageSize, ...(input.cursor ? { cursor: input.cursor } : {}) },
      }));
    }),

  getProspects: protectedProcedure
    .input(z.object({ audienceId: z.string(), pageSize: z.number().min(1).max(100).default(25), cursor: z.string().optional() }))
    .output(prospectsOutputSchema)
    .query(async ({ ctx, input }) => {
      return callFiber(() => getAudienceProspects({
        path: { audienceId: input.audienceId },
        query: { apiKey: ctx.apiKey, pageSize: input.pageSize, ...(input.cursor ? { cursor: input.cursor } : {}) },
      }));
    }),

  build: protectedProcedure
    .input(z.object({ audienceId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return callFiber(() => buildAudience({ path: { audienceId: input.audienceId }, body: { apiKey: ctx.apiKey } }));
    }),

  triggerEnrichment: protectedProcedure
    .input(z.object({ audienceId: z.string(), maxProspectsToEnrich: z.number().min(1).default(100), enrichmentType: enrichmentTypeSchema }))
    .mutation(async ({ ctx, input }) => {
      return callFiber(() => triggerEnrichment({
        path: { audienceId: input.audienceId },
        body: { apiKey: ctx.apiKey, maxProspectsToEnrich: input.maxProspectsToEnrich, enrichmentType: input.enrichmentType },
      }));
    }),

  updateSearchParams: protectedProcedure
    .input(z.object({
      audienceId: z.string(),
      companySearchParams: companySearchParamsSchema.optional(),
      prospectSearchParams: peopleSearchParamsSchema.optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return callFiber(() => updateAudienceSearchParams({
        path: { audienceId: input.audienceId },
        body: {
          apiKey: ctx.apiKey,
          ...(input.companySearchParams
            ? { companySearchParams: input.companySearchParams as Record<string, unknown> }
            : {}),
          ...(input.prospectSearchParams
            ? { prospectSearchParams: input.prospectSearchParams as Record<string, unknown> }
            : {}),
        },
      }));
    }),

  getEnrichmentStatus: protectedProcedure
    .input(z.object({ audienceId: z.string() }))
    .output(enrichmentStatusOutputSchema)
    .query(async ({ ctx, input }) => {
      return callFiber(() => getEnrichmentStatus({
        path: { audienceId: input.audienceId },
        query: { apiKey: ctx.apiKey },
      }));
    }),
});
