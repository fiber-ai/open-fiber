import { z } from "zod";
import {
  getRegions, getLanguages, getTimeZones,
  getIndustries, getTags, getNaicsCodes, getAccelerators,
  getSubdivisions,
  getOrgCredits, getAutoTopupSettings, updateAutoTopupSettings, buyCredits, getRateLimits,
  type GetOrgCreditsResponse,
} from "@fiberai/sdk";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, callFiber } from "../trpc";

// We trust the SDK's generated types for these responses, but a cheap runtime check keeps a
// clear error in the logs if the API shape ever drifts again (as it did in FIB-18656),
// instead of a confusing `x.map is not a function` further down.
function expectArray<T>(value: T[], endpoint: string): T[] {
  if (!Array.isArray(value)) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Unexpected response shape from ${endpoint}: expected an array, got ${typeof value}`,
    });
  }
  return value;
}

const operationLevelSchema = z.object({
  limit: z.number().nullable().optional(),
  centiCreditCost: z.number(),
});

const creditsPerOperationSchema = z
  .record(z.object({ levels: z.array(operationLevelSchema) }))
  .nullable()
  .optional();

// GET /v1/get-org-credits returns `output` as an array — one entry per active subscription.
// The SDK's generated types describe this correctly, so we use them as-is and just flatten
// the periods into a single aggregate view below.
type UsagePeriod = GetOrgCreditsResponse["output"][number];

// Per-subscription view of a usage period, as returned in getCredits' `periods`.
// `creditsPerOperation` is pricing, not usage, and is already exposed at the top level.
// Note: this and the other `.output()` schemas in this file are intentionally OpenFiber's
// own tRPC contract with the frontend, not a mirror of the Fiber API response (that is
// typed by the SDK). Don't swap them for the API shape.
const usagePeriodSummarySchema = z.object({
  subscriptionId: z.string(),
  max: z.number(),
  used: z.number(),
  available: z.number(),
  usagePeriodResetsOn: z.string(),
});

const creditsOutputSchema = z.object({
  output: z.object({
    organizationId: z.string(),
    max: z.number(),
    used: z.number(),
    available: z.number(),
    usagePeriodResetsOn: z.string(),
    creditsPerOperation: creditsPerOperationSchema,
    // The org's current usage periods, one per active subscription, soonest reset first.
    // The public API only exposes the *current* period — no history yet (FIB-15819).
    periods: z.array(usagePeriodSummarySchema),
  }).passthrough(),
}).passthrough();
type CreditsPerOperation = NonNullable<z.infer<typeof creditsPerOperationSchema>>;

// GET /v1/auto-topup/settings returns `output.settings` as an array — one entry per active
// subscription (typed correctly by the SDK). We show the org's primary auto top-up
// configuration: the first configured subscription, or the first subscription if none are
// configured yet. This schema is the getAutoTopUp tRPC output contract.
const autoTopUpSettingSchema = z.discriminatedUnion("configured", [
  z.object({
    configured: z.literal(true),
    subscriptionId: z.string(),
    isEnabled: z.boolean(),
    creditThreshold: z.number(),
    creditsToBuy: z.number(),
    maxPerDay: z.number().nullable().optional(),
    maxPerMonth: z.number().nullable().optional(),
  }).passthrough(),
  z.object({
    configured: z.literal(false),
    subscriptionId: z.string(),
  }).passthrough(),
]);

// Expects `periods` already sorted by usagePeriodResetsOn, soonest first.
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
    usagePeriodResetsOn: periods[0].usagePeriodResetsOn,
    creditsPerOperation,
  };
}

export const utilityRouter = createTRPCRouter({
  getCredits: protectedProcedure
    .output(creditsOutputSchema)
    .query(async ({ ctx }) => {
      const { output } = await callFiber(() =>
        getOrgCredits({ query: { apiKey: ctx.apiKey } })
      );
      // ISO 8601 date strings sort chronologically as plain strings.
      const sorted = [...expectArray(output, "/v1/get-org-credits")]
        .sort((a, b) => a.usagePeriodResetsOn.localeCompare(b.usagePeriodResetsOn));
      const periods = sorted.map(
        ({ subscriptionId, max, used, available, usagePeriodResetsOn }) => ({
          subscriptionId, max, used, available, usagePeriodResetsOn,
        })
      );
      return { output: { ...aggregateUsagePeriods(sorted), periods } };
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
    .output(z.object({ output: autoTopUpSettingSchema.nullable() }).passthrough())
    .query(async ({ ctx }) => {
      const { output } = await callFiber(() =>
        getAutoTopupSettings({ query: { apiKey: ctx.apiKey } })
      );
      const settings = expectArray(output.settings, "/v1/auto-topup/settings");
      const selected = settings.find((s) => s.configured) ?? settings[0] ?? null;
      return { output: selected };
    }),

  updateAutoTopUp: protectedProcedure
    .input(z.object({
      subscriptionId: z.string(),
      isEnabled: z.boolean(),
      creditThreshold: z.number().int().min(0).optional(),
      creditsToBuy: z.number().int().min(1).optional(),
    }))
    .output(z.object({ output: z.record(z.unknown()) }).passthrough())
    .mutation(async ({ ctx, input }) => {
      return callFiber(() => updateAutoTopupSettings({
        body: {
          apiKey: ctx.apiKey,
          subscriptionId: input.subscriptionId,
          isEnabled: input.isEnabled,
          creditThreshold: input.creditThreshold,
          creditsToBuy: input.creditsToBuy,
        },
      }));
    }),

  /** Buy credits — charges the organization's saved payment method via Stripe. */
  buyCredits: protectedProcedure
    .input(z.object({
      subscriptionId: z.string(),
      creditsToBuy: z.number().int().min(1),
      idempotencyKey: z.string().optional(),
    }))
    .output(z.object({ output: z.record(z.unknown()) }).passthrough())
    .mutation(async ({ ctx, input }) => {
      return callFiber(() => buyCredits({
        body: {
          apiKey: ctx.apiKey,
          subscriptionId: input.subscriptionId,
          creditsToBuy: input.creditsToBuy,
          idempotencyKey: input.idempotencyKey,
        },
      }));
    }),

  // --- Rate Limits ---
  getRateLimits: protectedProcedure
    .output(z.object({ output: z.record(z.unknown()) }).passthrough())
    .query(async ({ ctx }) => {
      return callFiber(() => getRateLimits({ query: { apiKey: ctx.apiKey } }));
    }),
});
