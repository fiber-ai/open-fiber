import { z } from "zod";
import {
  getOrgCredits, getRegions, getLanguages, getTimeZones,
  getIndustries, getTags, getNaicsCodes, getAccelerators,
  getSubdivisions,
  getAutoTopupSettings, updateAutoTopupSettings, buyCredits, getRateLimits,
} from "@fiberai/sdk";
import { createTRPCRouter, protectedProcedure, callFiber } from "../trpc";

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
