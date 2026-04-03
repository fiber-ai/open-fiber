import { z } from "zod";
import { exportCompanies, exportProspects } from "@fiberai/sdk";
import { createTRPCRouter, protectedProcedure, callFiber } from "../trpc";

const exportFormat = z.enum([
  "PROSPECT_GENERIC_CSV", "PROSPECT_LI_ADS_CSV", "PROSPECT_GOOGLE_ADS_CSV",
  "PROSPECT_META_ADS_CSV", "COMPANY_GENERIC_CSV", "COMPANY_LI_ADS_CSV",
  "LI_PROFILE_URL_FIXUP", "LI_COMPANY_URL_FIXUP", "GOOGLE_MAPS_CSV", "DOMAIN_AGENT_CSV",
]);

const exportResultSchema = z.object({
  output: z.object({
    message: z.string(),
    estimatedRows: z.number(),
    maxRowsAllowed: z.number().optional(),
  }).passthrough(),
}).passthrough();

export const exportsRouter = createTRPCRouter({
  exportCompanies: protectedProcedure
    .input(z.object({
      audienceId: z.string(),
      format: exportFormat,
      maxRowsToExport: z.number().nullable().optional(),
      excludeFields: z.array(z.string()).optional(),
      userEmail: z.string().email().nullable().optional(),
    }))
    .output(exportResultSchema)
    .mutation(async ({ ctx, input }) => {
      return callFiber(() =>
        exportCompanies({
          path: { audienceId: input.audienceId },
          body: { apiKey: ctx.apiKey, format: input.format, maxRowsToExport: input.maxRowsToExport ?? null, excludeFields: (input.excludeFields ?? []) as never[], userEmail: input.userEmail ?? null },
        })
      );
    }),

  exportProspects: protectedProcedure
    .input(z.object({
      audienceId: z.string(),
      format: exportFormat,
      maxRowsToExport: z.number().nullable().optional(),
      excludeFields: z.array(z.string()).optional(),
      onlyWithContacts: z.boolean().optional(),
      userEmail: z.string().email().nullable().optional(),
    }))
    .output(exportResultSchema)
    .mutation(async ({ ctx, input }) => {
      return callFiber(() =>
        exportProspects({
          path: { audienceId: input.audienceId },
          body: { apiKey: ctx.apiKey, format: input.format, maxRowsToExport: input.maxRowsToExport ?? null, excludeFields: (input.excludeFields ?? []) as never[], onlyWithContacts: input.onlyWithContacts, userEmail: input.userEmail ?? null },
        })
      );
    }),
});
