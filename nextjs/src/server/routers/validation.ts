import { z } from "zod";
import { emailBounceDetection, validatePhoneNumber } from "@fiberai/sdk";
import { createTRPCRouter, protectedProcedure, callFiber } from "../trpc";

const emailResultSchema = z.object({
  output: z.object({
    email: z.string(),
    verdict: z.string(),
    deliverability_score: z.number(),
    is_catch_all: z.boolean(),
    is_role_based: z.boolean(),
    is_disposable: z.boolean(),
    is_consumer: z.boolean(),
    email_provider: z.string(),
  }).passthrough(),
}).passthrough();

const phoneResultSchema = z.object({
  output: z.object({
    formattedNumber: z.string().nullable().optional(),
    nationalFormat: z.string().nullable().optional(),
    countryName: z.string().nullable().optional(),
    countryIsoCode: z.string().nullable().optional(),
    isValid: z.boolean(),
    isReachable: z.string(),
    isPorted: z.boolean(),
    isRoaming: z.boolean(),
    validationScore: z.number(),
    validationStatus: z.string(),
    callerIdName: z.string().nullable().optional(),
    currentCarrier: z.object({
      name: z.string().nullable().optional(),
      networkType: z.string().nullable().optional(),
    }).nullable().optional(),
  }).passthrough(),
}).passthrough();

export const validationRouter = createTRPCRouter({
  emailBounceDetection: protectedProcedure
    .input(z.object({ email: z.string().email() }))
    .output(emailResultSchema)
    .mutation(async ({ ctx, input }) => {
      return callFiber(() =>
        emailBounceDetection({ body: { apiKey: ctx.apiKey, email: input.email } })
      );
    }),

  validatePhoneNumber: protectedProcedure
    .input(z.object({ phoneNumber: z.string().min(1) }))
    .output(phoneResultSchema)
    .mutation(async ({ ctx, input }) => {
      return callFiber(() =>
        validatePhoneNumber({ body: { apiKey: ctx.apiKey, phoneNumber: input.phoneNumber } })
      );
    }),
});
