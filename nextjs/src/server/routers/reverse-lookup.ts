import { z } from "zod";
import { reverseEmailLookup, liteReverseEmailLookup, reversePhoneLookup } from "@fiberai/sdk";
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
});
