import { z } from "zod";
import {
  syncContactEnrichment, triggerContactEnrichment, pollContactEnrichmentResult,
  startBatchContactEnrichment, pollBatchContactEnrichment, estimateEnrichmentCost,
} from "@fiberai/sdk";
import { createTRPCRouter, protectedProcedure, callFiber } from "../trpc";
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
});
