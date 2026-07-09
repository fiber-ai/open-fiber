import { z } from "zod";
import { stealthFoundersSearch, stealthFoundersCount } from "@fiberai/sdk";
import { createTRPCRouter, protectedProcedure, callFiber } from "../trpc";
import { peopleSearchParamsSchema } from "@/lib/schemas/search";

const modeEnum = z.enum(["in-stealth", "left-stealth"]);

const searchResultSchema = z.object({
  output: z.object({
    data: z.array(z.record(z.unknown())),
    nextCursor: z.string().nullable().optional(),
  }).passthrough(),
}).passthrough();

export const stealthRouter = createTRPCRouter({
  search: protectedProcedure
    .input(z.object({
      mode: modeEnum,
      searchParams: peopleSearchParamsSchema.optional(),
      pageSize: z.number().int().min(1).max(100).default(25),
      cursor: z.string().nullable().optional(),
    }))
    .output(searchResultSchema)
    .mutation(async ({ ctx, input }) => {
      return callFiber(() => stealthFoundersSearch({
        body: {
          apiKey: ctx.apiKey,
          stealthConfig: { mode: input.mode },
          searchParams: (input.searchParams ?? {}) as Record<string, unknown>,
          pageSize: input.pageSize,
          cursor: input.cursor ?? null,
        },
      }));
    }),

  count: protectedProcedure
    .input(z.object({ mode: modeEnum, searchParams: peopleSearchParamsSchema.optional() }))
    .output(z.object({ output: z.record(z.unknown()) }).passthrough())
    .mutation(async ({ ctx, input }) => {
      return callFiber(() => stealthFoundersCount({
        body: { apiKey: ctx.apiKey, stealthConfig: { mode: input.mode }, searchParams: (input.searchParams ?? {}) as Record<string, unknown> },
      }));
    }),
});
