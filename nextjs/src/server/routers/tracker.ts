import { z } from "zod";
import {
  listTrackerCompanyLists, createTrackerCompanyList, getTrackerCompanyList,
  deleteTrackerCompanyList, addTrackerCompanies, removeTrackerCompanies,
  listTrackerPersonLists, createTrackerPersonList, getTrackerPersonList,
  deleteTrackerPersonList, addTrackerPeople, removeTrackerPeople,
  listTrackerSignals, getTrackerOverview,
  updateTrackerCompanyList, updateTrackerPersonList,
  refreshTrackerCompanyList, refreshTrackerPersonList,
  rescheduleTrackerCompanyList, rescheduleTrackerPersonList,
  listAvailableTrackerRules, previewTrackerSignal, fireTrackerDummy,
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
const listType = z.enum(["company", "person"]);
const ruleConfig = z.object({ type: z.string().min(1) }).passthrough();
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
    .input(z.object({
      listId: z.string(),
      cursor: z.string().nullable().optional(),
      pageSize: z.number().int().min(1).max(100).default(50),
      filter: z.enum(["all", "real", "dummy"]).default("all"),
    }))
    .output(signalsOutput)
    .query(async ({ ctx, input }) => callFiber(() => listTrackerSignals({ path: { listId: input.listId }, query: { apiKey: ctx.apiKey, cursor: input.cursor ?? undefined, pageSize: input.pageSize, filter: input.filter } }))),

  // --- List management (works for both list types) ---

  /** Rename, change cadence, pause/resume, and add / remove / flag tracking rules. */
  updateList: protectedProcedure
    .input(z.object({
      type: listType,
      listId: z.string(),
      name: z.string().trim().min(1).max(200).optional(),
      refreshIntervalDays: z.number().int().min(1).max(90).optional(),
      isActive: z.boolean().optional(),
      addRules: z.array(ruleConfig).optional(),
      removeRuleIds: z.array(z.string()).optional(),
      updateRuleFlags: z.array(z.object({ ruleId: z.string(), isDummy: z.boolean() })).optional(),
      initialSignalsLookbackDays: z.number().int().min(1).max(365).optional(),
    }))
    .output(genericOutput)
    .mutation(async ({ ctx, input }) => {
      const body = {
        apiKey: ctx.apiKey,
        name: input.name,
        refreshIntervalDays: input.refreshIntervalDays,
        isActive: input.isActive,
        // Rule configs are validated by the API against each rule's JSON schema.
        addRules: input.addRules as never,
        removeRuleIds: input.removeRuleIds,
        updateRuleFlags: input.updateRuleFlags,
        initialSignals: input.initialSignalsLookbackDays ? { lookbackPeriodDays: input.initialSignalsLookbackDays } : undefined,
      };
      return input.type === "company"
        ? callFiber(() => updateTrackerCompanyList({ path: { listId: input.listId }, body }))
        : callFiber(() => updateTrackerPersonList({ path: { listId: input.listId }, body }));
    }),

  /** Kick off an immediate refresh; the response includes an estimated credit cost. */
  refreshList: protectedProcedure
    .input(z.object({ type: listType, listId: z.string() }))
    .output(genericOutput)
    .mutation(async ({ ctx, input }) => {
      const args = { path: { listId: input.listId }, body: { apiKey: ctx.apiKey } };
      return input.type === "company" ? callFiber(() => refreshTrackerCompanyList(args)) : callFiber(() => refreshTrackerPersonList(args));
    }),

  rescheduleList: protectedProcedure
    .input(z.object({ type: listType, listId: z.string(), nextRefreshDate: z.string().min(1) }))
    .output(genericOutput)
    .mutation(async ({ ctx, input }) => {
      const args = { path: { listId: input.listId }, body: { apiKey: ctx.apiKey, nextRefreshDate: input.nextRefreshDate } };
      return input.type === "company" ? callFiber(() => rescheduleTrackerCompanyList(args)) : callFiber(() => rescheduleTrackerPersonList(args));
    }),

  /** Rule catalog with JSON schemas, example configs and example signals. Free. */
  availableRules: protectedProcedure
    .output(genericOutput)
    .query(async ({ ctx }) => callFiber(() => listAvailableTrackerRules({ query: { apiKey: ctx.apiKey } }))),

  /** Example signal for a rule config. Free, no side effects. */
  previewSignal: protectedProcedure
    .input(z.object({ config: ruleConfig }))
    .output(genericOutput)
    .mutation(async ({ ctx, input }) => callFiber(() => previewTrackerSignal({ body: { apiKey: ctx.apiKey, config: input.config as never } }))),

  /** Fire test (isDummy) signals for every dummy rule on a list; delivered to webhooks too. Free. */
  fireDummy: protectedProcedure
    .input(z.object({ listId: z.string() }))
    .output(genericOutput)
    .mutation(async ({ ctx, input }) => callFiber(() => fireTrackerDummy({ path: { listId: input.listId }, query: { apiKey: ctx.apiKey } }))),

  overview: protectedProcedure
    .output(genericOutput)
    .query(async ({ ctx }) => callFiber(() => getTrackerOverview({ query: { apiKey: ctx.apiKey } }))),
});
