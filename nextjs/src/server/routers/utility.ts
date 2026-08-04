import { z } from "zod";
import {
  getRegions, getLanguages, getTimeZones,
  getIndustries, getTags, getNaicsCodes, getAccelerators,
  getSubdivisions,
  getAutoTopupSettings, updateAutoTopupSettings, buyCredits, getRateLimits,
} from "@fiberai/sdk";
import { createTRPCRouter, protectedProcedure, callFiber, fiberFetch } from "../trpc";

const operationLevelSchema = z.object({
  limit: z.number().nullable().optional(),
  centiCreditCost: z.number(),
});

const creditsPerOperationSchema = z
  .record(z.object({ levels: z.array(operationLevelSchema) }))
  .nullable()
  .optional();

const creditsOutputSchema = z.object({
  output: z.object({
    organizationId: z.string(),
    max: z.number(),
    used: z.number(),
    available: z.number(),
    usagePeriodResetsOn: z.string(),
    creditsPerOperation: creditsPerOperationSchema,
  }).passthrough(),
}).passthrough();

// GET /v1/get-org-credits returns `output` as an array — one entry per active subscription
// (backend commit d5363339b6, "New billing - v1"). The @fiberai/sdk generated types/schema
// still describe `output` as a single object even at the latest available version, so we
// call this endpoint directly instead of via the (stale) SDK function and aggregate here.
const usagePeriodSchema = z.object({
  organizationId: z.string(),
  subscriptionId: z.string(),
  max: z.number(),
  used: z.number(),
  available: z.number(),
  usagePeriodResetsOn: z.string(),
  creditsPerOperation: creditsPerOperationSchema,
}).passthrough();

const rawCreditsResponseSchema = z.object({
  output: z.array(usagePeriodSchema),
}).passthrough();

type UsagePeriod = z.infer<typeof usagePeriodSchema>;
type CreditsPerOperation = NonNullable<z.infer<typeof creditsPerOperationSchema>>;

function aggregateUsagePeriods(periods: UsagePeriod[]) {
  if (periods.length === 0) {
    return {
      organizationId: "",
      max: 0,
      used: 0,
      available: 0,
      usagePeriodResetsOn: new Date(0).toISOString(),
      creditsPerOperation: null as CreditsPerOperation | null,
    };
  }

  // centiCreditCost is a per-call price, not a quantity — it must never be summed across
  // subscriptions (that would double the displayed cost of a single operation call). When
  // the same operation is priced by more than one subscription, just use whichever pricing
  // schedule we see first; there's no meaningful way to merge two different tier lists.
  const creditsPerOperation: CreditsPerOperation = {};
  for (const period of periods) {
    for (const [key, value] of Object.entries(period.creditsPerOperation ?? {})) {
      if (!(key in creditsPerOperation)) {
        creditsPerOperation[key] = value;
      }
    }
  }

  return {
    organizationId: periods[0].organizationId,
    max: periods.reduce((sum, p) => sum + p.max, 0),
    used: periods.reduce((sum, p) => sum + p.used, 0),
    available: periods.reduce((sum, p) => sum + p.available, 0),
    // ISO 8601 date strings sort chronologically as plain strings.
    usagePeriodResetsOn: [...periods].map((p) => p.usagePeriodResetsOn).sort()[0],
    creditsPerOperation,
  };
}

export const utilityRouter = createTRPCRouter({
  getCredits: protectedProcedure
    .output(creditsOutputSchema)
    .query(async ({ ctx }) => {
      const raw = rawCreditsResponseSchema.parse(
        await fiberFetch<unknown>(ctx.apiKey, "GET", "/v1/get-org-credits")
      );
      return { output: aggregateUsagePeriods(raw.output) };
    }),

  getRegions: protectedProcedure.query(async ({ ctx }) => {
    return callFiber(() => getRegions({ query: { apiKey: ctx.apiKey } }));
  }),

  getLanguages: protectedProcedure.query(async ({ ctx }) => {
    return callFiber(() => getLanguages({ query: { apiKey: ctx.apiKey } }));
  }),

  getTimeZones: protectedProcedure.query(async ({ ctx }) => {
    return callFiber(() => getTimeZones({ query: { apiKey: ctx.apiKey } }));
  }),

  getIndustries: protectedProcedure.query(async ({ ctx }) => {
    return callFiber(() => getIndustries({ query: { apiKey: ctx.apiKey } }));
  }),

  getTags: protectedProcedure.query(async ({ ctx }) => {
    return callFiber(() => getTags({ query: { apiKey: ctx.apiKey } }));
  }),

  getNaicsCodes: protectedProcedure.query(async ({ ctx }) => {
    return callFiber(() => getNaicsCodes({ query: { apiKey: ctx.apiKey } }));
  }),

  getAccelerators: protectedProcedure.query(async ({ ctx }) => {
    return callFiber(() => getAccelerators({ query: { apiKey: ctx.apiKey } }));
  }),

  getSubdivisions: protectedProcedure
    .input(z.object({ countryCode: z.string().min(2).max(3) }))
    .query(async ({ ctx, input }) => {
      return callFiber(() =>
        getSubdivisions({ query: { apiKey: ctx.apiKey, countryCode: input.countryCode } })
      );
    }),

  // --- Billing ---
  getAutoTopUp: protectedProcedure
    .output(z.object({ output: z.record(z.unknown()) }).passthrough())
    .query(async ({ ctx }) => {
      return callFiber(() => getAutoTopupSettings({ query: { apiKey: ctx.apiKey } }));
    }),

  updateAutoTopUp: protectedProcedure
    .input(z.object({
      isEnabled: z.boolean(),
      creditThreshold: z.number().int().min(0).optional(),
      creditsToBuy: z.number().int().min(1).optional(),
    }))
    .output(z.object({ output: z.record(z.unknown()) }).passthrough())
    .mutation(async ({ ctx, input }) => {
      return callFiber(() => updateAutoTopupSettings({
        body: {
          apiKey: ctx.apiKey,
          isEnabled: input.isEnabled,
          creditThreshold: input.creditThreshold,
          creditsToBuy: input.creditsToBuy,
        },
      }));
    }),

  /** Buy credits — charges the organization's saved payment method via Stripe. */
  buyCredits: protectedProcedure
    .input(z.object({ creditsToBuy: z.number().int().min(1), idempotencyKey: z.string().optional() }))
    .output(z.object({ output: z.record(z.unknown()) }).passthrough())
    .mutation(async ({ ctx, input }) => {
      return callFiber(() => buyCredits({
        body: { apiKey: ctx.apiKey, creditsToBuy: input.creditsToBuy, idempotencyKey: input.idempotencyKey },
      }));
    }),

  // --- Rate Limits ---
  getRateLimits: protectedProcedure
    .output(z.object({ output: z.record(z.unknown()) }).passthrough())
    .query(async ({ ctx }) => {
      return callFiber(() => getRateLimits({ query: { apiKey: ctx.apiKey } }));
    }),
});
