import { z } from "zod";
import {
  estimateEnrichmentCost,
  syncQuickContactReveal, syncTurboContactEnrichment,
  startBatchContactDetails, pollBatchContactDetails,
  triggerExhaustiveContactEnrichment, pollExhaustiveContactEnrichmentResult,
  instantContactReveal, liteContactReveal, basicWorkEmailReveal, premiumPhoneReveal,
} from "@fiberai/sdk";
import { createTRPCRouter, protectedProcedure, callFiber } from "../trpc";
import { enrichmentTypeSchema, patienceSchema } from "@/lib/schemas/enrichment";

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

const passthrough = z.object({ output: z.record(z.unknown()) }).passthrough();

/** Instant + lite accept either a LinkedIn identifier or a full name + company domain. */
const personInput = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("linkedin"), linkedinIdentifier: z.string().trim().min(1) }),
  z.object({ mode: z.literal("name-domain"), fullName: z.string().trim().min(1), companyDomain: z.string().trim().min(3) }),
]);

export const enrichmentRouter = createTRPCRouter({
  // --- Cheaper / specialised stacks (Contact Reveal page) ---

  /** Instant: only what's already on file, no live discovery. SDK: instantContactReveal */
  instantReveal: protectedProcedure
    .input(z.object({ input: personInput, enrichmentType: enrichmentTypeSchema }))
    .output(passthrough)
    .mutation(async ({ ctx, input }) => {
      return callFiber(() => instantContactReveal({ body: { apiKey: ctx.apiKey, input: input.input, enrichmentType: input.enrichmentType } }));
    }),

  /** Lite: low-cost, lower-yield discovery. SDK: liteContactReveal */
  liteReveal: protectedProcedure
    .input(z.object({ input: personInput, enrichmentType: enrichmentTypeSchema, patience: patienceSchema }))
    .output(passthrough)
    .mutation(async ({ ctx, input }) => {
      return callFiber(() => liteContactReveal({ body: { apiKey: ctx.apiKey, input: input.input, enrichmentType: input.enrichmentType, patience: input.patience ?? null } }));
    }),

  /** Work email from name + company, no LinkedIn needed. SDK: basicWorkEmailReveal */
  basicWorkEmail: protectedProcedure
    .input(z.object({ fullName: z.string().trim().min(1), companyDomain: z.string().trim().min(3) }))
    .output(passthrough)
    .mutation(async ({ ctx, input }) => {
      return callFiber(() => basicWorkEmailReveal({
        body: { apiKey: ctx.apiKey, name: { mode: "fullName", fullName: input.fullName }, company: { mode: "domain", domain: input.companyDomain } },
      }));
    }),

  /** Phone numbers verified against caller ID. SDK: premiumPhoneReveal */
  premiumPhone: protectedProcedure
    .input(z.object({ linkedinUrl: z.string().trim().min(1), patience: patienceSchema }))
    .output(passthrough)
    .mutation(async ({ ctx, input }) => {
      return callFiber(() => premiumPhoneReveal({ body: { apiKey: ctx.apiKey, linkedinUrl: input.linkedinUrl, patience: input.patience ?? null } }));
    }),

  // --- Reveal Variants ---

  /** Default (Standard) reveal. SDK: syncQuickContactReveal (POST /v1/contact-details/single) */
  syncStandardReveal: protectedProcedure
    .input(z.object({ linkedinUrl: z.string(), enrichmentType: enrichmentTypeSchema, patience: patienceSchema }))
    .output(syncEnrichResultSchema)
    .mutation(async ({ ctx, input }) => {
      return callFiber(() =>
        syncQuickContactReveal({ body: { apiKey: ctx.apiKey, linkedinUrl: input.linkedinUrl, enrichmentType: input.enrichmentType, patience: input.patience ?? undefined } })
      );
    }),

  /** Premium/Turbo reveal — widest first-pass waterfall. SDK: syncTurboContactEnrichment */
  syncPremiumReveal: protectedProcedure
    .input(z.object({ linkedinUrl: z.string(), enrichmentType: enrichmentTypeSchema, patience: patienceSchema }))
    .output(syncEnrichResultSchema)
    .mutation(async ({ ctx, input }) => {
      return callFiber(() =>
        syncTurboContactEnrichment({ body: { apiKey: ctx.apiKey, linkedinUrl: input.linkedinUrl, enrichmentType: input.enrichmentType, patience: input.patience ?? undefined } })
      );
    }),

  /** Exhaustive reveal — most thorough, async waterfall. SDK: triggerExhaustiveContactEnrichment + poll */
  triggerExhaustiveReveal: protectedProcedure
    .input(z.object({ linkedinUrl: z.string(), enrichmentType: enrichmentTypeSchema }))
    .output(triggerResultSchema)
    .mutation(async ({ ctx, input }) => {
      return callFiber(() =>
        triggerExhaustiveContactEnrichment({ body: { apiKey: ctx.apiKey, linkedinUrl: input.linkedinUrl, enrichmentType: input.enrichmentType } })
      );
    }),

  pollExhaustiveReveal: protectedProcedure
    .input(z.object({ taskId: z.string() }))
    .output(pollEnrichResultSchema)
    .query(async ({ ctx, input }) => {
      return callFiber(() =>
        pollExhaustiveContactEnrichmentResult({ body: { apiKey: ctx.apiKey, taskId: input.taskId } })
      );
    }),

  // --- Batch Contact Reveal ---
  startBatchEnrichment: protectedProcedure
    .input(z.object({ people: z.array(z.object({ linkedinUrl: z.string() })), enrichmentType: enrichmentTypeSchema }))
    .output(batchStartResultSchema)
    .mutation(async ({ ctx, input }) => {
      return callFiber(() =>
        startBatchContactDetails({
          body: { apiKey: ctx.apiKey, personDetails: input.people.map((p) => ({ linkedinUrl: { value: p.linkedinUrl } })), enrichmentTypes: input.enrichmentType },
        })
      );
    }),

  pollBatchEnrichment: protectedProcedure
    .input(z.object({ taskId: z.string(), cursor: z.string().nullable().optional(), take: z.number().min(1).max(100).default(100) }))
    .output(batchPollResultSchema)
    .query(async ({ ctx, input }) => {
      return callFiber(() =>
        pollBatchContactDetails({ body: { apiKey: ctx.apiKey, taskId: input.taskId, cursor: input.cursor ?? null, take: input.take } })
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
