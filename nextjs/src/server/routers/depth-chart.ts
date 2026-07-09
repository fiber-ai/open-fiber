import { z } from "zod";
import { startDepthChart, pollDepthChart } from "@fiberai/sdk";
import { createTRPCRouter, protectedProcedure, callFiber } from "../trpc";

export const depthChartRouter = createTRPCRouter({
  start: protectedProcedure
    .input(z.object({
      identifier: z.enum(["linkedinUrl", "linkedinSlug", "linkedinOrgId", "domain"]),
      value: z.string().trim().min(1),
    }))
    .output(z.object({ output: z.object({ reportId: z.string() }).passthrough() }).passthrough())
    .mutation(async ({ ctx, input }) => {
      return callFiber(() => startDepthChart({
        body: { apiKey: ctx.apiKey, company: { identifier: input.identifier, value: input.value } },
      }));
    }),

  poll: protectedProcedure
    .input(z.object({ reportId: z.string() }))
    .output(z.object({ output: z.record(z.unknown()) }).passthrough())
    .query(async ({ ctx, input }) => {
      return callFiber(() => pollDepthChart({ body: { apiKey: ctx.apiKey, reportId: input.reportId } }));
    }),
});
