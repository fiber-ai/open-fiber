import { z } from "zod";
import { reverseEmailLookup, liteReverseEmailLookup, reversePhoneLookup, hemLookup } from "@fiberai/sdk";
import { createTRPCRouter, protectedProcedure, callFiber } from "../trpc";

const passthrough = z.object({ output: z.record(z.unknown()) }).passthrough();

export const reverseLookupRouter = createTRPCRouter({
  /** Email → LinkedIn person. `lite` is cheaper (1 vs 2 credits) but skips the yield-boosting steps. */
  email: protectedProcedure
    .input(z.object({ email: z.string().trim().email(), lite: z.boolean().default(false) }))
    .output(passthrough)
    .mutation(async ({ ctx, input }) => {
      const body = { apiKey: ctx.apiKey, email: input.email };
      return input.lite
        ? callFiber(() => liteReverseEmailLookup({ body }))
        : callFiber(() => reverseEmailLookup({ body }));
    }),

  /** Phone → LinkedIn person or company. */
  phone: protectedProcedure
    .input(z.object({ phoneNumber: z.string().trim().min(6) }))
    .output(passthrough)
    .mutation(async ({ ctx, input }) => {
      return callFiber(() => reversePhoneLookup({ body: { apiKey: ctx.apiKey, phoneNumber: input.phoneNumber } }));
    }),

  /** Hashed emails (SHA-256 / SHA-1 / MD5 of the lowercased, trimmed address) → email + LinkedIn. Max 100 per call. */
  hashed: protectedProcedure
    .input(z.object({ hashedEmails: z.array(z.string().trim().min(1).max(64)).min(1).max(100) }))
    .output(z.object({
      output: z.object({
        data: z.array(z.object({
          status: z.enum(["found", "not_found", "rejected"]),
          hashedEmail: z.string(),
          originalEmail: z.string().optional(),
          linkedinUrl: z.string().nullable().optional(),
          linkedinUserID: z.string().nullable().optional(),
          message: z.string().optional(),
        }).passthrough()),
      }).passthrough(),
    }).passthrough())
    .mutation(async ({ ctx, input }) => {
      return callFiber(() => hemLookup({ body: { apiKey: ctx.apiKey, hashedEmails: input.hashedEmails } }));
    }),
});
