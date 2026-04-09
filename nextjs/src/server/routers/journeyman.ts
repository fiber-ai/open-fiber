import { z } from "zod";
import { createTRPCRouter, protectedProcedure, fiberFetch } from "../trpc";

/**
 * Job Change Tracking (Journeyman) router.
 *
 * Backend routes are all POST under /v1/job-changes/*.
 * IDs are passed in the request body as `jobChangeListId`.
 * Not yet in @fiberai/sdk — using fiberFetch for direct API calls.
 */

export const journeymanRouter = createTRPCRouter({
  createList: protectedProcedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return fiberFetch(ctx.apiKey, "POST", "/v1/job-changes/create-list", {
        name: input.name,
      });
    }),

  getLists: protectedProcedure
    .query(async ({ ctx }) => {
      return fiberFetch<Record<string, unknown>>(ctx.apiKey, "POST", "/v1/job-changes/list-all", {});
    }),

  getList: protectedProcedure
    .input(z.object({ listId: z.string() }))
    .query(async ({ ctx, input }) => {
      return fiberFetch<Record<string, unknown>>(ctx.apiKey, "POST", "/v1/job-changes/get-list", {
        jobChangeListId: input.listId,
      });
    }),

  updateList: protectedProcedure
    .input(z.object({ listId: z.string(), name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return fiberFetch(ctx.apiKey, "POST", "/v1/job-changes/update-list", {
        jobChangeListId: input.listId,
        newName: input.name,
      });
    }),

  deleteList: protectedProcedure
    .input(z.object({ listId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return fiberFetch(ctx.apiKey, "POST", "/v1/job-changes/delete-list", {
        jobChangeListId: input.listId,
      });
    }),

  addPeople: protectedProcedure
    .input(z.object({
      listId: z.string(),
      people: z.array(z.object({ linkedinUrl: z.string().min(1) })).min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      return fiberFetch(ctx.apiKey, "POST", "/v1/job-changes/add-profiles", {
        jobChangeListId: input.listId,
        profiles: input.people,
      });
    }),

  removePeople: protectedProcedure
    .input(z.object({
      listId: z.string(),
      profileIds: z.array(z.string().min(1)).min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      return fiberFetch(ctx.apiKey, "POST", "/v1/job-changes/delete-profiles", {
        jobChangeListId: input.listId,
        profileIds: input.profileIds,
      });
    }),

  getListPeople: protectedProcedure
    .input(z.object({
      listId: z.string(),
      pageSize: z.number().min(1).max(100).default(25),
      cursor: z.string().nullable().optional(),
    }))
    .query(async ({ ctx, input }) => {
      return fiberFetch<Record<string, unknown>>(ctx.apiKey, "POST", "/v1/job-changes/list-all-profiles", {
        jobChangeListId: input.listId,
        pageSize: input.pageSize,
        cursor: input.cursor,
      });
    }),
});
