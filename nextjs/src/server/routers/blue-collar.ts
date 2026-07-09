import { z } from "zod";
import { blueCollarJobsSearch, blueCollarResolveCompany } from "@fiberai/sdk";
import { createTRPCRouter, protectedProcedure, callFiber } from "../trpc";

export const blueCollarRouter = createTRPCRouter({
  search: protectedProcedure
    .input(z.object({
      query: z.string().trim().min(1).optional(),
      companySlug: z.string().trim().min(1).optional(),
      location: z.string().trim().min(1).optional(),
      nextPageToken: z.string().nullable().optional(),
    }))
    .output(z.object({
      output: z.object({
        jobs: z.array(z.record(z.unknown())).optional(),
        total: z.number().nullable().optional(),
        nextPageToken: z.string().nullable().optional(),
      }).passthrough(),
    }).passthrough())
    .mutation(async ({ ctx, input }) => {
      return callFiber(() => blueCollarJobsSearch({
        body: {
          apiKey: ctx.apiKey,
          query: input.query,
          companySlug: input.companySlug,
          location: input.location,
          nextPageToken: input.nextPageToken ?? null,
        },
      }));
    }),

  resolveCompany: protectedProcedure
    .input(z.object({ companyName: z.string().trim().min(1).optional(), domain: z.string().trim().min(1).optional() }))
    .output(z.object({ output: z.record(z.unknown()) }).passthrough())
    .mutation(async ({ ctx, input }) => {
      return callFiber(() => blueCollarResolveCompany({ body: { apiKey: ctx.apiKey, companyName: input.companyName, domain: input.domain } }));
    }),
});
