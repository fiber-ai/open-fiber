import { z } from "zod";
import { bulkCompanyLogos, bulkProfilePic, companyLogo } from "@fiberai/sdk";
import { createTRPCRouter, protectedProcedure, callFiber } from "../trpc";

export const mediaRouter = createTRPCRouter({
  /** Single logo; the API auto-detects LinkedIn URL / slug / org ID / domain. */
  companyLogo: protectedProcedure
    .input(z.object({ identifier: z.string().trim().min(1) }))
    .output(z.object({ output: z.object({ logoUrl: z.string().nullable().optional() }).passthrough() }).passthrough())
    .mutation(async ({ ctx, input }) => {
      return callFiber(() => companyLogo({ body: { apiKey: ctx.apiKey, identifier: input.identifier } }));
    }),

  companyLogos: protectedProcedure
    .input(z.object({
      type: z.enum(["domains", "linkedinUrls", "liOrgIds"]),
      values: z.array(z.string().trim().min(1)).min(1).max(10000),
    }))
    .output(z.object({ output: z.record(z.unknown()) }).passthrough())
    .mutation(async ({ ctx, input }) => {
      const companiesIdentifier =
        input.type === "domains" ? { type: "domains" as const, domains: input.values }
        : input.type === "linkedinUrls" ? { type: "linkedinUrls" as const, linkedinUrls: input.values }
        : { type: "liOrgIds" as const, liOrgIds: input.values };
      return callFiber(() => bulkCompanyLogos({ body: { apiKey: ctx.apiKey, companiesIdentifier } }));
    }),

  profilePics: protectedProcedure
    .input(z.object({ linkedinUrls: z.array(z.string().trim().min(1)).min(1).max(10000) }))
    .output(z.object({ output: z.record(z.unknown()) }).passthrough())
    .mutation(async ({ ctx, input }) => {
      return callFiber(() => bulkProfilePic({ body: { apiKey: ctx.apiKey, linkedinUrls: input.linkedinUrls } }));
    }),
});
