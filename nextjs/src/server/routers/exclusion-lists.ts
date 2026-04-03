import { z } from "zod";
import {
  createCompanyExclusionList, deleteCompanyExclusionList, getCompanyExclusionLists,
  addCompaniesToExclusionList, removeCompanyFromExclusionList, getExcludedCompaniesForExclusionList,
  createCompanyExclusionListFromAudience,
  createProspectExclusionList, deleteProspectExclusionList, getProspectExclusionLists,
  addProspectsToExclusionList, removeProspectFromExclusionList, getExcludedProspectsForExclusionList,
  createProspectExclusionListFromAudience,
} from "@fiberai/sdk";
import { createTRPCRouter, protectedProcedure, callFiber } from "../trpc";

const companyListItemSchema = z.object({ listID: z.string(), name: z.string() }).passthrough();
const prospectListItemSchema = z.object({ listId: z.string(), name: z.string() }).passthrough();

const companyListsOutputSchema = z.object({ output: z.array(companyListItemSchema) }).passthrough();
const prospectListsOutputSchema = z.object({ output: z.array(prospectListItemSchema) }).passthrough();

const excludedCompaniesSchema = z.object({
  output: z.object({
    companies: z.array(z.object({
      id: z.string(), domain: z.string().nullable(), linkedInUrl: z.string().nullable(), name: z.string().nullable(),
    }).passthrough()),
    nextCursor: z.string().nullable().optional(),
    hasMore: z.boolean(),
  }).passthrough(),
}).passthrough();

const excludedProspectsSchema = z.object({
  output: z.object({
    data: z.array(z.object({ linkedinUrl: z.string().nullable().optional() }).passthrough()).optional(),
    nextCursor: z.string().nullable().optional(),
    hasMore: z.boolean().optional(),
  }).passthrough(),
}).passthrough();

export const exclusionListRouter = createTRPCRouter({
  // --- Company ---
  listCompanyLists: protectedProcedure
    .output(companyListsOutputSchema)
    .query(async ({ ctx }) => {
      return callFiber(() => getCompanyExclusionLists({ body: { apiKey: ctx.apiKey } }));
    }),

  createCompanyList: protectedProcedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return callFiber(() => createCompanyExclusionList({ body: { apiKey: ctx.apiKey, name: input.name } }));
    }),

  deleteCompanyList: protectedProcedure
    .input(z.object({ listIDs: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      return callFiber(() => deleteCompanyExclusionList({ body: { apiKey: ctx.apiKey, listIDs: input.listIDs } }));
    }),

  addCompanies: protectedProcedure
    .input(z.object({ listId: z.string(), companies: z.array(z.object({ domain: z.string().nullable().optional(), linkedinUrl: z.string().nullable().optional() })) }))
    .mutation(async ({ ctx, input }) => {
      return callFiber(() => addCompaniesToExclusionList({ body: { apiKey: ctx.apiKey, listId: input.listId, companies: input.companies } }));
    }),

  removeCompany: protectedProcedure
    .input(z.object({ listId: z.string(), domains: z.array(z.string()).optional(), linkedinUrls: z.array(z.string()).optional() }))
    .mutation(async ({ ctx, input }) => {
      return callFiber(() => removeCompanyFromExclusionList({
        body: { apiKey: ctx.apiKey, listId: input.listId, excludedCompanyDetails: { domains: input.domains ?? null, linkedinUrls: input.linkedinUrls ?? null } },
      }));
    }),

  getExcludedCompanies: protectedProcedure
    .input(z.object({ exclusionListId: z.string(), cursor: z.string().nullable().optional(), pageSize: z.number().min(1).max(100).default(25) }))
    .output(excludedCompaniesSchema)
    .query(async ({ ctx, input }) => {
      return callFiber(() => getExcludedCompaniesForExclusionList({
        body: { apiKey: ctx.apiKey, exclusionListId: input.exclusionListId, cursor: input.cursor ?? undefined, pageSize: input.pageSize },
      }));
    }),

  createCompanyListFromAudience: protectedProcedure
    .input(z.object({ audienceId: z.string(), name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return callFiber(() => createCompanyExclusionListFromAudience({ body: { apiKey: ctx.apiKey, audienceId: input.audienceId, name: input.name } }));
    }),

  // --- Prospect ---
  listProspectLists: protectedProcedure
    .output(prospectListsOutputSchema)
    .query(async ({ ctx }) => {
      return callFiber(() => getProspectExclusionLists({ body: { apiKey: ctx.apiKey } }));
    }),

  createProspectList: protectedProcedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return callFiber(() => createProspectExclusionList({ body: { apiKey: ctx.apiKey, name: input.name } }));
    }),

  deleteProspectList: protectedProcedure
    .input(z.object({ listIds: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      return callFiber(() => deleteProspectExclusionList({ body: { apiKey: ctx.apiKey, listIds: input.listIds } }));
    }),

  addProspects: protectedProcedure
    .input(z.object({ listId: z.string(), prospects: z.array(z.object({ linkedinUrl: z.string().nullable().optional() })) }))
    .mutation(async ({ ctx, input }) => {
      return callFiber(() => addProspectsToExclusionList({ body: { apiKey: ctx.apiKey, listId: input.listId, prospects: input.prospects } }));
    }),

  removeProspect: protectedProcedure
    .input(z.object({ listId: z.string(), linkedinUrls: z.array(z.string()).optional() }))
    .mutation(async ({ ctx, input }) => {
      return callFiber(() => removeProspectFromExclusionList({
        body: { apiKey: ctx.apiKey, listId: input.listId, excludedProspectDetails: { linkedinUrls: input.linkedinUrls ?? [] } },
      }));
    }),

  getExcludedProspects: protectedProcedure
    .input(z.object({ exclusionListId: z.string(), cursor: z.string().nullable().optional(), pageSize: z.number().min(1).max(100).default(25) }))
    .output(excludedProspectsSchema)
    .query(async ({ ctx, input }) => {
      return callFiber(() => getExcludedProspectsForExclusionList({
        body: { apiKey: ctx.apiKey, exclusionListId: input.exclusionListId, cursor: input.cursor ?? undefined, pageSize: input.pageSize },
      }));
    }),

  createProspectListFromAudience: protectedProcedure
    .input(z.object({ audienceId: z.string(), name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return callFiber(() => createProspectExclusionListFromAudience({ body: { apiKey: ctx.apiKey, audienceId: input.audienceId, name: input.name } }));
    }),
});
