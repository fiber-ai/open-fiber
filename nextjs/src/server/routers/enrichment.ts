import { z } from "zod";
import {
  syncContactEnrichment, triggerContactEnrichment, pollContactEnrichmentResult,
  startBatchContactEnrichment, pollBatchContactEnrichment, estimateEnrichmentCost,
  syncQuickContactReveal, syncTurboContactEnrichment,
} from "@fiberai/sdk";
import { createTRPCRouter, protectedProcedure, callFiber, fiberFetch } from "../trpc";
import { enrichmentTypeSchema } from "@/lib/schemas/enrichment";

const emailSchema = z.object({
  email: z.string(), type: z.string(), status: z.string().nullable().optional(),
}).passthrough();

const phoneSchema = z.object({
  number: z.string(), type: z.string(),
}).passthrough();

const syncEnrichResultSchema = z.object({
  output: z.object({
    profile: z.object({
      emails: z.array(emailSchema),
      phoneNumbers: z.array(phoneSchema),
      status: z.string(),
      error: z.string().nullable().optional(),
      exhaustive: z.boolean().nullable().optional(),
    }).passthrough(),
    done: z.boolean(),
  }).passthrough(),
}).passthrough();

const triggerResultSchema = z.object({
  output: z.object({ taskId: z.string() }).passthrough(),
}).passthrough();

const pollEnrichResultSchema = z.object({
  output: z.object({
    profile: z.object({
      emails: z.array(emailSchema),
      phoneNumbers: z.array(phoneSchema),
      status: z.string(),
      error: z.string().nullable().optional(),
    }).passthrough().nullable().optional(),
  }).passthrough(),
}).passthrough();

const batchStartResultSchema = z.object({
  output: z.object({
    taskId: z.string(),
    numPeopleEnqueued: z.number(),
    numDuplicatesSkipped: z.number().nullable().optional(),
  }).passthrough(),
}).passthrough();

const batchPollResultSchema = z.object({
  output: z.object({
    overallStats: z.object({
      totalPeopleToFetch: z.number(), numCompleted: z.number(),
      numRemaining: z.number(), numRejected: z.number(), numDuplicates: z.number(),
    }).passthrough(),
    done: z.boolean(),
    pageResults: z.array(z.object({
      inputs: z.object({ linkedinUrl: z.object({ value: z.string() }) }).passthrough(),
      outputs: z.object({
        emails: z.array(emailSchema), phoneNumbers: z.array(phoneSchema),
      }).passthrough().nullable().optional(),
    }).passthrough()),
    nextCursor: z.string().nullable().optional(),
  }).passthrough(),
}).passthrough();

export const enrichmentRouter = createTRPCRouter({
  syncContactEnrichment: protectedProcedure
    .input(z.object({ linkedinUrl: z.string(), enrichmentType: enrichmentTypeSchema }))
    .output(syncEnrichResultSchema)
    .mutation(async ({ ctx, input }) => {
      return callFiber(() =>
        syncContactEnrichment({ body: { apiKey: ctx.apiKey, linkedinUrl: input.linkedinUrl, enrichmentType: input.enrichmentType } })
      );
    }),

  triggerContactEnrichment: protectedProcedure
    .input(z.object({ linkedinUrl: z.string(), enrichmentType: enrichmentTypeSchema }))
    .output(triggerResultSchema)
    .mutation(async ({ ctx, input }) => {
      return callFiber(() =>
        triggerContactEnrichment({ body: { apiKey: ctx.apiKey, linkedinUrl: { value: input.linkedinUrl }, enrichmentType: input.enrichmentType } })
      );
    }),

  pollContactEnrichment: protectedProcedure
    .input(z.object({ taskId: z.string() }))
    .output(pollEnrichResultSchema)
    .query(async ({ ctx, input }) => {
      return callFiber(() =>
        pollContactEnrichmentResult({ body: { apiKey: ctx.apiKey, taskId: input.taskId } })
      );
    }),

  startBatchEnrichment: protectedProcedure
    .input(z.object({ people: z.array(z.object({ linkedinUrl: z.string() })), enrichmentType: enrichmentTypeSchema }))
    .output(batchStartResultSchema)
    .mutation(async ({ ctx, input }) => {
      return callFiber(() =>
        startBatchContactEnrichment({
          body: { apiKey: ctx.apiKey, personDetails: input.people.map((p) => ({ linkedinUrl: { value: p.linkedinUrl } })), enrichmentTypes: input.enrichmentType },
        })
      );
    }),

  pollBatchEnrichment: protectedProcedure
    .input(z.object({ taskId: z.string(), cursor: z.string().nullable().optional(), take: z.number().min(1).max(100).default(100) }))
    .output(batchPollResultSchema)
    .query(async ({ ctx, input }) => {
      return callFiber(() =>
        pollBatchContactEnrichment({ body: { apiKey: ctx.apiKey, taskId: input.taskId, cursor: input.cursor ?? null, take: input.take } })
      );
    }),

  estimateCost: protectedProcedure
    .input(z.object({ audienceId: z.string(), maxProspectsToEnrich: z.number().min(1), enrichmentType: enrichmentTypeSchema, runCompanyLiveEnrichment: z.boolean().optional() }))
    .query(async ({ ctx, input }) => {
      return callFiber(() =>
        estimateEnrichmentCost({
          path: { audienceId: input.audienceId },
          body: { apiKey: ctx.apiKey, maxProspectsToEnrich: input.maxProspectsToEnrich, enrichmentType: input.enrichmentType, runCompanyLiveEnrichment: input.runCompanyLiveEnrichment },
        })
      );
    }),

  // --- Reveal Variants ---

  /** Slim reveal — faster, lighter data. SDK: syncQuickContactReveal */
  syncSlimReveal: protectedProcedure
    .input(z.object({ linkedinUrl: z.string(), enrichmentType: enrichmentTypeSchema }))
    .output(syncEnrichResultSchema)
    .mutation(async ({ ctx, input }) => {
      return callFiber(() =>
        syncQuickContactReveal({ body: { apiKey: ctx.apiKey, linkedinUrl: input.linkedinUrl, enrichmentType: input.enrichmentType } })
      );
    }),

  /** Premium/Turbo reveal — higher quality data. SDK: syncTurboContactEnrichment */
  syncPremiumReveal: protectedProcedure
    .input(z.object({ linkedinUrl: z.string(), enrichmentType: enrichmentTypeSchema }))
    .output(syncEnrichResultSchema)
    .mutation(async ({ ctx, input }) => {
      return callFiber(() =>
        syncTurboContactEnrichment({ body: { apiKey: ctx.apiKey, linkedinUrl: input.linkedinUrl, enrichmentType: input.enrichmentType } })
      );
    }),

  /** Druid reveal — streamlined. Not yet in SDK v0.0.5 */
  syncDruidReveal: protectedProcedure
    .input(z.object({ linkedinUrl: z.string(), enrichmentType: enrichmentTypeSchema }))
    .output(syncEnrichResultSchema)
    .mutation(async ({ ctx, input }) => {
      return fiberFetch(ctx.apiKey, "POST", "/v1/druid-reveal/sync", {
        linkedinUrl: input.linkedinUrl,
        enrichmentType: input.enrichmentType,
      });
    }),

  /** Exhaustive reveal — most thorough, async only. Not yet in SDK v0.0.5 */
  triggerExhaustiveReveal: protectedProcedure
    .input(z.object({ linkedinUrl: z.string(), enrichmentType: enrichmentTypeSchema }))
    .output(triggerResultSchema)
    .mutation(async ({ ctx, input }) => {
      return fiberFetch(ctx.apiKey, "POST", "/v1/exhaustive-reveal/start", {
        linkedinUrl: input.linkedinUrl,
        enrichmentType: input.enrichmentType,
      });
    }),

  pollExhaustiveReveal: protectedProcedure
    .input(z.object({ taskId: z.string() }))
    .output(pollEnrichResultSchema)
    .query(async ({ ctx, input }) => {
      return fiberFetch(ctx.apiKey, "POST", "/v1/exhaustive-reveal/poll", {
        taskId: input.taskId,
      });
    }),

  // --- Bulk Contact Details ---
  /** Not yet in SDK v0.0.5 */
  triggerBulkContactDetails: protectedProcedure
    .input(z.object({
      people: z.array(z.object({ linkedinUrl: z.string() })).min(1),
      enrichmentType: enrichmentTypeSchema,
    }))
    .output(z.object({ output: z.object({ taskId: z.string() }).passthrough() }).passthrough())
    .mutation(async ({ ctx, input }) => {
      return fiberFetch(ctx.apiKey, "POST", "/v1/bulk-contact-details/start", {
        personDetails: input.people.map((p) => ({ linkedinUrl: { value: p.linkedinUrl } })),
        enrichmentTypes: input.enrichmentType,
      });
    }),

  pollBulkContactDetails: protectedProcedure
    .input(z.object({ taskId: z.string(), cursor: z.string().nullable().optional(), take: z.number().min(1).max(100).default(100) }))
    .output(batchPollResultSchema)
    .query(async ({ ctx, input }) => {
      return fiberFetch(ctx.apiKey, "POST", "/v1/bulk-contact-details/poll", {
        taskId: input.taskId,
        cursor: input.cursor,
        take: input.take,
      });
    }),
});
