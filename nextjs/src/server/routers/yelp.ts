import { z } from "zod";
import { yelpSearch, yelpPlace, yelpReviews } from "@fiberai/sdk";
import { createTRPCRouter, protectedProcedure, callFiber } from "../trpc";

const passthrough = z.object({ output: z.record(z.unknown()) }).passthrough();

export const yelpRouter = createTRPCRouter({
  search: protectedProcedure
    .input(z.object({
      location: z.string().trim().min(2),
      categories: z.array(z.string().trim().min(1)).optional(),
      sortBy: z.enum(["relevance", "highestRated", "mostReviewed"]).optional(),
      nextPageToken: z.string().nullable().optional(),
    }))
    .output(passthrough)
    .mutation(async ({ ctx, input }) => {
      return callFiber(() => yelpSearch({
        body: {
          apiKey: ctx.apiKey,
          location: input.location,
          categories: input.categories?.length ? input.categories : null,
          sortBy: input.sortBy ?? null,
          nextPageToken: input.nextPageToken ?? null,
        },
      }));
    }),

  place: protectedProcedure
    .input(z.object({ placeId: z.string().min(1) }))
    .output(passthrough)
    .query(async ({ ctx, input }) => {
      return callFiber(() => yelpPlace({ body: { apiKey: ctx.apiKey, placeId: input.placeId } }));
    }),

  reviews: protectedProcedure
    .input(z.object({
      placeId: z.string().min(1),
      sortBy: z.enum(["relevance", "newestFirst", "oldestFirst", "highestRated", "lowestRated", "elitesFirst"]).optional(),
      ratings: z.array(z.number().int().min(1).max(5)).optional(),
      keywords: z.array(z.string().trim().min(1)).optional(),
      cursor: z.string().nullable().optional(),
    }))
    .output(passthrough)
    .query(async ({ ctx, input }) => {
      return callFiber(() => yelpReviews({
        body: {
          apiKey: ctx.apiKey,
          placeId: input.placeId,
          sortBy: input.sortBy ?? null,
          ratings: input.ratings?.length ? input.ratings : null,
          keywords: input.keywords?.length ? input.keywords : null,
          nextPageToken: input.cursor ?? null,
        },
      }));
    }),
});
