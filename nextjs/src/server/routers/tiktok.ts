import { z } from "zod";
import {
  tiktokProfile,
  tiktokUserVideos,
  tiktokSearchKeyword,
  tiktokSearchUsers,
  tiktokVideoDetails,
  tiktokVideoComments,
} from "@fiberai/sdk";
import { createTRPCRouter, protectedProcedure, callFiber } from "../trpc";

const videosOutput = z.object({
  output: z.object({
    videos: z.array(z.record(z.unknown())).optional(),
    users: z.array(z.record(z.unknown())).optional(),
    nextPageToken: z.string().nullable().optional(),
  }).passthrough(),
}).passthrough();

export const tiktokRouter = createTRPCRouter({
  profile: protectedProcedure
    .input(z.object({ handle: z.string().trim().min(1) }))
    .output(z.object({ output: z.record(z.unknown()) }).passthrough())
    .mutation(async ({ ctx, input }) => {
      return callFiber(() => tiktokProfile({ body: { apiKey: ctx.apiKey, handle: input.handle } }));
    }),

  userVideos: protectedProcedure
    .input(z.object({ handle: z.string().trim().min(1), nextPageToken: z.string().nullable().optional() }))
    .output(videosOutput)
    .mutation(async ({ ctx, input }) => {
      return callFiber(() => tiktokUserVideos({ body: { apiKey: ctx.apiKey, handle: input.handle, nextPageToken: input.nextPageToken ?? null } }));
    }),

  searchKeyword: protectedProcedure
    .input(z.object({ query: z.string().trim().min(1), nextPageToken: z.string().nullable().optional() }))
    .output(videosOutput)
    .mutation(async ({ ctx, input }) => {
      return callFiber(() => tiktokSearchKeyword({ body: { apiKey: ctx.apiKey, query: input.query, nextPageToken: input.nextPageToken ?? null } }));
    }),

  searchUsers: protectedProcedure
    .input(z.object({ query: z.string().trim().min(1), nextPageToken: z.string().nullable().optional() }))
    .output(videosOutput)
    .mutation(async ({ ctx, input }) => {
      return callFiber(() => tiktokSearchUsers({ body: { apiKey: ctx.apiKey, query: input.query, nextPageToken: input.nextPageToken ?? null } }));
    }),

  videoDetails: protectedProcedure
    .input(z.object({ videoUrl: z.string().trim().min(1) }))
    .output(z.object({ output: z.record(z.unknown()) }).passthrough())
    .mutation(async ({ ctx, input }) => {
      return callFiber(() => tiktokVideoDetails({ body: { apiKey: ctx.apiKey, videoUrl: input.videoUrl } }));
    }),

  videoComments: protectedProcedure
    .input(z.object({ videoUrl: z.string().trim().min(1), nextPageToken: z.string().nullable().optional() }))
    .output(z.object({ output: z.record(z.unknown()) }).passthrough())
    .mutation(async ({ ctx, input }) => {
      return callFiber(() => tiktokVideoComments({ body: { apiKey: ctx.apiKey, videoUrl: input.videoUrl, nextPageToken: input.nextPageToken ?? null } }));
    }),
});
