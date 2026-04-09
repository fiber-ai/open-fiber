import { z } from "zod";
import {
  getOrgCredits, getRegions, getLanguages, getTimeZones,
  getIndustries, getTags, getNaicsCodes, getAccelerators,
  getSubdivisions,
} from "@fiberai/sdk";
import { createTRPCRouter, protectedProcedure, callFiber, fiberFetch } from "../trpc";

const operationLevelSchema = z.object({
  limit: z.number().nullable().optional(),
  centiCreditCost: z.number(),
});

const creditsOutputSchema = z.object({
  output: z.object({
    organizationId: z.string(),
    max: z.number(),
    used: z.number(),
    available: z.number(),
    usagePeriodResetsOn: z.string(),
    creditsPerOperation: z.record(z.object({ levels: z.array(operationLevelSchema) })).nullable().optional(),
  }).passthrough(),
}).passthrough();

export const utilityRouter = createTRPCRouter({
  getCredits: protectedProcedure
    .output(creditsOutputSchema)
    .query(async ({ ctx }) => {
      return callFiber(() => getOrgCredits({ query: { apiKey: ctx.apiKey } }));
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
  // Not yet in @fiberai/sdk v0.0.5 — using fiberFetch
  getAutoTopUp: protectedProcedure
    .output(z.object({ output: z.record(z.unknown()) }).passthrough())
    .query(async ({ ctx }) => {
      return fiberFetch(ctx.apiKey, "GET", "/v1/billing/auto-topup");
    }),

  updateAutoTopUp: protectedProcedure
    .input(z.object({
      enabled: z.boolean(),
      threshold: z.number().min(0).optional(),
      amount: z.number().min(0).optional(),
    }))
    .output(z.object({ output: z.record(z.unknown()) }).passthrough())
    .mutation(async ({ ctx, input }) => {
      return fiberFetch(ctx.apiKey, "POST", "/v1/billing/auto-topup", {
        enabled: input.enabled,
        ...(input.threshold != null ? { threshold: input.threshold } : {}),
        ...(input.amount != null ? { amount: input.amount } : {}),
      });
    }),

  /** Buy credits — may redirect to Stripe or process directly depending on backend config */
  buyCredits: protectedProcedure
    .input(z.object({ amount: z.number().min(1) }))
    .output(z.object({ output: z.record(z.unknown()) }).passthrough())
    .mutation(async ({ ctx, input }) => {
      return fiberFetch(ctx.apiKey, "POST", "/v1/billing/buy-credits", {
        amount: input.amount,
      });
    }),
});
