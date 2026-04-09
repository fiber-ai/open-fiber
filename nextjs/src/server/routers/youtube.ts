import { z } from "zod";
import { createTRPCRouter, protectedProcedure, fiberFetch } from "../trpc";

/**
 * YouTube endpoints are not yet in @fiberai/sdk v0.0.5.
 * Using fiberFetch() for direct API calls. When the SDK adds these,
 * swap fiberFetch to SDK calls — no schema changes needed.
 */

const genericOutput = z.object({ output: z.record(z.unknown()) }).passthrough();

const paginatedOutput = z.object({
  output: z.object({
    data: z.array(z.record(z.unknown())).optional(),
    results: z.array(z.record(z.unknown())).optional(),
    items: z.array(z.record(z.unknown())).optional(),
    nextPageToken: z.string().nullable().optional(),
  }).passthrough(),
}).passthrough();

export const youtubeRouter = createTRPCRouter({
  search: protectedProcedure
    .input(z.object({ query: z.string().min(1), nextPageToken: z.string().nullable().optional() }))
    .output(paginatedOutput)
    .mutation(async ({ ctx, input }) => {
      return fiberFetch(ctx.apiKey, "POST", "/v1/youtube/search", { query: input.query, nextPageToken: input.nextPageToken });
    }),

  getVideoDetails: protectedProcedure
    .input(z.object({ videoId: z.string().min(1) }))
    .output(genericOutput)
    .mutation(async ({ ctx, input }) => {
      return fiberFetch(ctx.apiKey, "POST", "/v1/youtube/video-details", { videoId: input.videoId });
    }),

  getVideoComments: protectedProcedure
    .input(z.object({ videoId: z.string().min(1), nextPageToken: z.string().nullable().optional() }))
    .output(paginatedOutput)
    .mutation(async ({ ctx, input }) => {
      return fiberFetch(ctx.apiKey, "POST", "/v1/youtube/video-comments", { videoId: input.videoId, nextPageToken: input.nextPageToken });
    }),

  getTranscript: protectedProcedure
    .input(z.object({ videoId: z.string().min(1), languageCode: z.string().nullable().optional() }))
    .output(genericOutput)
    .mutation(async ({ ctx, input }) => {
      return fiberFetch(ctx.apiKey, "POST", "/v1/youtube/transcript", { videoId: input.videoId, languageCode: input.languageCode });
    }),

  getChannel: protectedProcedure
    .input(z.object({ channelIdentifier: z.string().min(1), nextPageToken: z.string().nullable().optional() }))
    .output(paginatedOutput)
    .mutation(async ({ ctx, input }) => {
      return fiberFetch(ctx.apiKey, "POST", "/v1/youtube/channel", { channelIdentifier: input.channelIdentifier, nextPageToken: input.nextPageToken });
    }),
});
