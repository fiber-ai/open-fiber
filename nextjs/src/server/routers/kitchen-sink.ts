import { z } from "zod";
import { kitchenSinkProfile, kitchenSinkBulkProfile } from "@fiberai/sdk";
import { createTRPCRouter, protectedProcedure, callFiber } from "../trpc";

const value = z.object({ value: z.string().trim().min(1) });
const looseValue = value.extend({ looseMatch: z.boolean().optional() });

/** Every matching signal the person kitchen-sink endpoints accept. All optional — send what you have. */
const personSignals = z.object({
  profileIdentifier: z.object({ identifier: z.enum(["linkedinSlug", "linkedinUrl", "userID"]), value: z.string().trim().min(1) }).optional(),
  emailAddress: z.string().trim().email().optional(),
  personName: looseValue.optional(),
  jobTitle: value.optional(),
  linkedinHeadline: looseValue.optional(),
  companyIdentifier: z.object({ identifier: z.enum(["linkedinSlug", "linkedinUrl", "linkedinOrgID"]), value: z.string().trim().min(1) }).optional(),
  companyName: value.optional(),
  companyDomain: value.optional(),
  profileLocation: z.object({ countryCode: z.string().optional(), stateName: z.string().optional(), locality: z.string().optional() }).optional(),
  schoolName: value.optional(),
  numProfiles: z.number().int().min(1).max(10).optional(),
});

const options = z.object({
  liveFetch: z.boolean().optional(),
  forceCompanyMatch: z.boolean().optional(),
  fuzzySearch: z.boolean().optional(),
  thoroughness: z.enum(["low", "high"]).optional(),
  getDetailedEducation: z.boolean().optional(),
  getDetailedWorkExperience: z.boolean().optional(),
});

const passthrough = z.object({ output: z.record(z.unknown()) }).passthrough();

export const kitchenSinkRouter = createTRPCRouter({
  person: protectedProcedure
    .input(personSignals.merge(options))
    .output(passthrough)
    .mutation(async ({ ctx, input }) => callFiber(() => kitchenSinkProfile({ body: { apiKey: ctx.apiKey, ...input } }))),

  /** Up to 50 people per call. Options apply to every row. */
  bulkPeople: protectedProcedure
    .input(z.object({
      profiles: z.array(personSignals.pick({ profileIdentifier: true, emailAddress: true, personName: true, jobTitle: true, companyIdentifier: true, companyName: true, companyDomain: true, numProfiles: true })).min(1).max(50),
    }).merge(options))
    .output(passthrough)
    .mutation(async ({ ctx, input }) => {
      const { profiles, ...opts } = input;
      return callFiber(() => kitchenSinkBulkProfile({ body: { apiKey: ctx.apiKey, profiles, ...opts } }));
    }),
});
