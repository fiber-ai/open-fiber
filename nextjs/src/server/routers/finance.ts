import { z } from "zod";
import { financialInstrumentLookup } from "@fiberai/sdk";
import { createTRPCRouter, protectedProcedure, callFiber } from "../trpc";

const instrumentSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("index"),
    index: z.enum([
      "SP_500", "DOW_JONES", "NASDAQ_100", "NASDAQ_COMPOSITE",
      "RUSSELL_1000", "RUSSELL_2000", "RUSSELL_3000", "FTSE_100",
    ]),
  }),
  z.object({ type: z.literal("mutualFund"), ticker: z.string().min(1) }),
  z.object({ type: z.literal("stockOrEtf"), ticker: z.string().min(1), exchange: z.string().min(1) }),
  z.object({ type: z.literal("currencyPair"), base: z.string().min(1), quote: z.string().min(1) }),
  z.object({ type: z.literal("customSymbol"), symbol: z.string().min(1) }),
]);

export const financeRouter = createTRPCRouter({
  lookupInstrument: protectedProcedure
    .input(z.object({
      instrument: instrumentSchema,
      window: z.enum(["1D", "5D", "1M", "6M", "YTD", "1Y", "5Y", "MAX"]).nullable().optional(),
    }))
    .output(z.object({ output: z.record(z.unknown()) }).passthrough())
    .mutation(async ({ ctx, input }) => {
      return callFiber(() => financialInstrumentLookup({
        body: { apiKey: ctx.apiKey, instrument: input.instrument, window: input.window ?? undefined },
      }));
    }),
});
