import { z } from "zod";
import {
  getOrgCredits, getRegions, getLanguages, getTimeZones,
  getIndustries, getTags, getNaicsCodes, getAccelerators,
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
});
