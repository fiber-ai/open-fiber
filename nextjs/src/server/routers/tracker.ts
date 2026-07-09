import { z } from "zod";
import {
  listTrackerCompanyLists, createTrackerCompanyList, getTrackerCompanyList,
  deleteTrackerCompanyList, addTrackerCompanies, removeTrackerCompanies,
  listTrackerPersonLists, createTrackerPersonList, getTrackerPersonList,
  deleteTrackerPersonList, addTrackerPeople, removeTrackerPeople,
  listTrackerSignals, getTrackerOverview,
} from "@fiberai/sdk";
import { createTRPCRouter, protectedProcedure, callFiber } from "../trpc";

const listsOutput = z.object({ output: z.object({ lists: z.array(z.record(z.unknown())).optional() }).passthrough() }).passthrough();
const genericOutput = z.object({ output: z.record(z.unknown()) }).passthrough();
const signalsOutput = z.object({ output: z.object({ signals: z.array(z.record(z.unknown())).optional(), nextCursor: z.string().nullable().optional() }).passthrough() }).passthrough();

const createInput = z.object({
  name: z.string().trim().min(1).max(200),
  refreshIntervalDays: z.number().int().min(1).max(90).default(7),
});
const companiesInput = z.array(z.object({
  domain: z.string().trim().min(1).nullable().optional(),
  linkedinUrl: z.string().trim().min(1).nullable().optional(),
})).min(1);
const peopleInput = z.array(z.object({
  linkedinUrl: z.string().trim().min(1),
})).min(1);

export const trackerRouter = createTRPCRouter({
  // --- Company tracker lists ---
  companyLists: protectedProcedure
    .output(listsOutput)
    .query(async ({ ctx }) => callFiber(() => listTrackerCompanyLists({ query: { apiKey: ctx.apiKey } }))),

  createCompanyList: protectedProcedure
    .input(createInput)
    .output(genericOutput)
    .mutation(async ({ ctx, input }) => callFiber(() => createTrackerCompanyList({ body: { apiKey: ctx.apiKey, name: input.name, refreshIntervalDays: input.refreshIntervalDays } }))),

  getCompanyList: protectedProcedure
    .input(z.object({ listId: z.string() }))
    .output(genericOutput)
    .query(async ({ ctx, input }) => callFiber(() => getTrackerCompanyList({ path: { listId: input.listId }, query: { apiKey: ctx.apiKey } }))),

  deleteCompanyList: protectedProcedure
    .input(z.object({ listId: z.string() }))
    .output(genericOutput)
    .mutation(async ({ ctx, input }) => callFiber(() => deleteTrackerCompanyList({ path: { listId: input.listId }, query: { apiKey: ctx.apiKey } }))),

  addCompanies: protectedProcedure
    .input(z.object({ listId: z.string(), companies: companiesInput }))
    .output(genericOutput)
    .mutation(async ({ ctx, input }) => callFiber(() => addTrackerCompanies({ path: { listId: input.listId }, body: { apiKey: ctx.apiKey, companies: input.companies } }))),

  removeCompanies: protectedProcedure
    .input(z.object({ listId: z.string(), companies: companiesInput }))
    .output(genericOutput)
    .mutation(async ({ ctx, input }) => callFiber(() => removeTrackerCompanies({ path: { listId: input.listId }, query: { apiKey: ctx.apiKey }, body: { companies: input.companies } }))),

  // --- Person tracker lists ---
  personLists: protectedProcedure
    .output(listsOutput)
    .query(async ({ ctx }) => callFiber(() => listTrackerPersonLists({ query: { apiKey: ctx.apiKey } }))),

  createPersonList: protectedProcedure
    .input(createInput)
    .output(genericOutput)
    .mutation(async ({ ctx, input }) => callFiber(() => createTrackerPersonList({ body: { apiKey: ctx.apiKey, name: input.name, refreshIntervalDays: input.refreshIntervalDays } }))),

  getPersonList: protectedProcedure
    .input(z.object({ listId: z.string() }))
    .output(genericOutput)
    .query(async ({ ctx, input }) => callFiber(() => getTrackerPersonList({ path: { listId: input.listId }, query: { apiKey: ctx.apiKey } }))),

  deletePersonList: protectedProcedure
    .input(z.object({ listId: z.string() }))
    .output(genericOutput)
    .mutation(async ({ ctx, input }) => callFiber(() => deleteTrackerPersonList({ path: { listId: input.listId }, query: { apiKey: ctx.apiKey } }))),

  addPeople: protectedProcedure
    .input(z.object({ listId: z.string(), people: peopleInput }))
    .output(genericOutput)
    .mutation(async ({ ctx, input }) => callFiber(() => addTrackerPeople({ path: { listId: input.listId }, body: { apiKey: ctx.apiKey, people: input.people } }))),

  removePeople: protectedProcedure
    .input(z.object({ listId: z.string(), people: peopleInput }))
    .output(genericOutput)
    .mutation(async ({ ctx, input }) => callFiber(() => removeTrackerPeople({ path: { listId: input.listId }, query: { apiKey: ctx.apiKey }, body: { people: input.people } }))),

  // --- Shared ---
  signals: protectedProcedure
    .input(z.object({ listId: z.string(), cursor: z.string().nullable().optional(), pageSize: z.number().int().min(1).max(100).default(50) }))
    .output(signalsOutput)
    .query(async ({ ctx, input }) => callFiber(() => listTrackerSignals({ path: { listId: input.listId }, query: { apiKey: ctx.apiKey, cursor: input.cursor ?? undefined, pageSize: input.pageSize } }))),

  overview: protectedProcedure
    .output(genericOutput)
    .query(async ({ ctx }) => callFiber(() => getTrackerOverview({ query: { apiKey: ctx.apiKey } }))),
});
