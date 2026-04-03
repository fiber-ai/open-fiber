import { z } from "zod";

export const enrichmentTypeSchema = z.object({
  getWorkEmails: z.boolean().default(true),
  getPersonalEmails: z.boolean().default(false),
  getPhoneNumbers: z.boolean().default(false),
});

export const singleEnrichmentSchema = z.object({
  linkedinUrl: z.string().min(1, "LinkedIn URL is required"),
  enrichmentType: enrichmentTypeSchema,
});

export const batchEnrichmentSchema = z.object({
  people: z.array(z.object({
    linkedinUrl: z.string().min(1),
  })).min(1, "At least one person is required").max(10000, "Maximum 10,000 people"),
  enrichmentType: enrichmentTypeSchema,
});

export const linkedinLiveSchema = z.object({
  identifier: z.string().min(1, "LinkedIn URL or slug is required"),
});

export const reverseEmailSchema = z.object({
  email: z.string().email("Valid email required"),
});

export type EnrichmentType = z.infer<typeof enrichmentTypeSchema>;
export type SingleEnrichmentInput = z.infer<typeof singleEnrichmentSchema>;
