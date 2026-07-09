import { z } from "zod";
import {
  youtubeSearch,
  youtubeVideoDetails,
  youtubeVideoComments,
  youtubeTranscript,
  youtubeChannel,
} from "@fiberai/sdk";
import { createTRPCRouter, protectedProcedure, callFiber } from "../trpc";

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
      return callFiber(() => youtubeSearch({ body: { apiKey: ctx.apiKey, query: input.query, nextPageToken: input.nextPageToken ?? null } }));
    }),

  getVideoDetails: protectedProcedure
    .input(z.object({ videoId: z.string().min(1) }))
    .output(genericOutput)
    .mutation(async ({ ctx, input }) => {
      return callFiber(() => youtubeVideoDetails({ body: { apiKey: ctx.apiKey, videoId: input.videoId } }));
    }),

  getVideoComments: protectedProcedure
    .input(z.object({ videoId: z.string().min(1), nextPageToken: z.string().nullable().optional() }))
    .output(paginatedOutput)
    .mutation(async ({ ctx, input }) => {
      return callFiber(() => youtubeVideoComments({ body: { apiKey: ctx.apiKey, videoId: input.videoId, nextPageToken: input.nextPageToken ?? null } }));
    }),

  getTranscript: protectedProcedure
    .input(z.object({ videoId: z.string().min(1), languageCode: z.string().nullable().optional() }))
    .output(genericOutput)
    .mutation(async ({ ctx, input }) => {
      return callFiber(() => youtubeTranscript({ body: { apiKey: ctx.apiKey, videoId: input.videoId, languageCode: input.languageCode ?? null } }));
    }),

  getChannel: protectedProcedure
    .input(z.object({ channelIdentifier: z.string().min(1), nextPageToken: z.string().nullable().optional() }))
    .output(paginatedOutput)
    .mutation(async ({ ctx, input }) => {
      return callFiber(() => youtubeChannel({ body: { apiKey: ctx.apiKey, channelIdentifier: input.channelIdentifier, nextPageToken: input.nextPageToken ?? null } }));
    }),
});
