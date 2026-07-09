import { z } from "zod";
import {
  createJobChangeList,
  listAllJobChangeLists,
  getJobChangeList,
  updateJobChangeList,
  deleteJobChangeList,
  addProfilesToList,
  deleteProfilesFromJobChangeList,
  listAllProfilesFromJobChangeList,
} from "@fiberai/sdk";
import { createTRPCRouter, protectedProcedure, callFiber } from "../trpc";

/**
 * Job Change Tracking (Journeyman) router.
 * Backed by the native @fiberai/sdk job-change functions (/v1/job-changes/*).
 */

const genericOutput = z.object({ output: z.record(z.unknown()) }).passthrough();

export const journeymanRouter = createTRPCRouter({
  createList: protectedProcedure
    .input(z.object({ name: z.string().min(1) }))
    .output(genericOutput)
    .mutation(async ({ ctx, input }) => {
      return callFiber(() => createJobChangeList({ body: { apiKey: ctx.apiKey, name: input.name } }));
    }),

  getLists: protectedProcedure
    .output(genericOutput)
    .query(async ({ ctx }) => {
      return callFiber(() => listAllJobChangeLists({ body: { apiKey: ctx.apiKey } }));
    }),

  getList: protectedProcedure
    .input(z.object({ listId: z.string() }))
    .output(genericOutput)
    .query(async ({ ctx, input }) => {
      return callFiber(() => getJobChangeList({ body: { apiKey: ctx.apiKey, jobChangeListId: input.listId } }));
    }),

  updateList: protectedProcedure
    .input(z.object({ listId: z.string(), name: z.string().min(1) }))
    .output(genericOutput)
    .mutation(async ({ ctx, input }) => {
      return callFiber(() => updateJobChangeList({ body: { apiKey: ctx.apiKey, jobChangeListId: input.listId, newName: input.name } }));
    }),

  deleteList: protectedProcedure
    .input(z.object({ listId: z.string() }))
    .output(genericOutput)
    .mutation(async ({ ctx, input }) => {
      return callFiber(() => deleteJobChangeList({ body: { apiKey: ctx.apiKey, jobChangeListId: input.listId } }));
    }),

  addPeople: protectedProcedure
    .input(z.object({
      listId: z.string(),
      people: z.array(z.object({ linkedinUrl: z.string().min(1) })).min(1),
    }))
    .output(genericOutput)
    .mutation(async ({ ctx, input }) => {
      return callFiber(() => addProfilesToList({ body: { apiKey: ctx.apiKey, jobChangeListId: input.listId, profiles: input.people } }));
    }),

  removePeople: protectedProcedure
    .input(z.object({
      listId: z.string(),
      profileIds: z.array(z.string().min(1)).min(1),
    }))
    .output(genericOutput)
    .mutation(async ({ ctx, input }) => {
      return callFiber(() => deleteProfilesFromJobChangeList({ body: { apiKey: ctx.apiKey, jobChangeListId: input.listId, profileIds: input.profileIds } }));
    }),

  getListPeople: protectedProcedure
    .input(z.object({
      listId: z.string(),
      pageSize: z.number().min(1).max(100).default(25),
      cursor: z.string().nullable().optional(),
    }))
    .output(genericOutput)
    .query(async ({ ctx, input }) => {
      return callFiber(() => listAllProfilesFromJobChangeList({ body: { apiKey: ctx.apiKey, jobChangeListId: input.listId, pageSize: input.pageSize, cursor: input.cursor ?? null } }));
    }),
});
