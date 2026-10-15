import { z } from "zod";
import { googleMapsSearch2, googleMapsPlace, googleMapsReviews } from "@fiberai/sdk";
import { createTRPCRouter, protectedProcedure, callFiber } from "../trpc";

const passthrough = z.object({ output: z.record(z.unknown()) }).passthrough();

/**
 * Synchronous Google Maps endpoints. The async bulk extractor (start/check/poll)
 * lives in the tools router; these back the "Quick search" mode and place details
 * on the same /tools/google-maps page rather than a separate page.
 */
export const googleMapsRouter = createTRPCRouter({
  search: protectedProcedure
    .input(z.object({
      query: z.string().trim().min(1),
      location: z.string().trim().optional(),
      nextPageToken: z.string().nullable().optional(),
    }))
    .output(passthrough)
    .mutation(async ({ ctx, input }) => {
      return callFiber(() => googleMapsSearch2({
        body: { apiKey: ctx.apiKey, query: input.query, location: input.location || null, nextPageToken: input.nextPageToken ?? null },
      }));
    }),

  place: protectedProcedure
    .input(z.object({ placeId: z.string().min(1) }))
    .output(passthrough)
    .query(async ({ ctx, input }) => {
      return callFiber(() => googleMapsPlace({ body: { apiKey: ctx.apiKey, placeId: input.placeId } }));
    }),

  reviews: protectedProcedure
    .input(z.object({
      placeId: z.string().min(1),
      sortBy: z.enum(["relevance", "newest"]).default("relevance"),
      cursor: z.string().nullable().optional(),
    }))
    .output(passthrough)
    .query(async ({ ctx, input }) => {
      return callFiber(() => googleMapsReviews({
        body: { apiKey: ctx.apiKey, placeId: input.placeId, sortBy: input.sortBy, nextPageToken: input.cursor ?? null },
      }));
    }),
});
