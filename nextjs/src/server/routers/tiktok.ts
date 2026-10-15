import { z } from "zod";
import {
  tiktokProfile,
  tiktokUserVideos,
  tiktokSearchKeyword,
  tiktokSearchUsers,
  tiktokVideoDetails,
  tiktokVideoComments,
  tiktokUserFollowers,
  tiktokUserFollowing,
  tiktokCommentReplies,
  tiktokVideoTranscript,
  tiktokSearchHashtag,
  tiktokUnifiedSearch,
  tiktokPopularSongs,
  tiktokTrendingFeed,
  tiktokSongDetails,
  tiktokSongVideos,
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

  userFollowers: protectedProcedure
    .input(z.object({ handle: z.string().trim().min(1), nextPageToken: z.string().nullable().optional() }))
    .output(videosOutput)
    .mutation(async ({ ctx, input }) => {
      return callFiber(() => tiktokUserFollowers({ body: { apiKey: ctx.apiKey, handle: input.handle, nextPageToken: input.nextPageToken ?? null } }));
    }),

  userFollowing: protectedProcedure
    .input(z.object({ handle: z.string().trim().min(1), nextPageToken: z.string().nullable().optional() }))
    .output(videosOutput)
    .mutation(async ({ ctx, input }) => {
      return callFiber(() => tiktokUserFollowing({ body: { apiKey: ctx.apiKey, handle: input.handle, nextPageToken: input.nextPageToken ?? null } }));
    }),

  commentReplies: protectedProcedure
    .input(z.object({ videoUrl: z.string().trim().min(1), commentId: z.string().min(1), nextPageToken: z.string().nullable().optional() }))
    .output(z.object({ output: z.record(z.unknown()) }).passthrough())
    .mutation(async ({ ctx, input }) => {
      return callFiber(() => tiktokCommentReplies({ body: { apiKey: ctx.apiKey, videoUrl: input.videoUrl, commentId: input.commentId, nextPageToken: input.nextPageToken ?? null } }));
    }),

  videoTranscript: protectedProcedure
    .input(z.object({ videoUrl: z.string().trim().min(1) }))
    .output(z.object({ output: z.record(z.unknown()) }).passthrough())
    .mutation(async ({ ctx, input }) => {
      return callFiber(() => tiktokVideoTranscript({ body: { apiKey: ctx.apiKey, videoUrl: input.videoUrl } }));
    }),

  searchHashtag: protectedProcedure
    .input(z.object({ query: z.string().trim().min(1), nextPageToken: z.string().nullable().optional() }))
    .output(videosOutput)
    .mutation(async ({ ctx, input }) => {
      return callFiber(() => tiktokSearchHashtag({ body: { apiKey: ctx.apiKey, query: input.query.replace(/^#/, ""), nextPageToken: input.nextPageToken ?? null } }));
    }),

  /** Videos and users for a query in one call. */
  unifiedSearch: protectedProcedure
    .input(z.object({ query: z.string().trim().min(1), nextPageToken: z.string().nullable().optional() }))
    .output(videosOutput)
    .mutation(async ({ ctx, input }) => {
      return callFiber(() => tiktokUnifiedSearch({ body: { apiKey: ctx.apiKey, query: input.query, nextPageToken: input.nextPageToken ?? null } }));
    }),

  popularSongs: protectedProcedure
    .output(z.object({ output: z.record(z.unknown()) }).passthrough())
    .mutation(async ({ ctx }) => {
      return callFiber(() => tiktokPopularSongs({ body: { apiKey: ctx.apiKey } }));
    }),

  trendingFeed: protectedProcedure
    .input(z.object({ nextPageToken: z.string().nullable().optional() }))
    .output(videosOutput)
    .mutation(async ({ ctx, input }) => {
      return callFiber(() => tiktokTrendingFeed({ body: { apiKey: ctx.apiKey, nextPageToken: input.nextPageToken ?? null } }));
    }),

  songDetails: protectedProcedure
    .input(z.object({ songUrl: z.string().trim().url() }))
    .output(z.object({ output: z.record(z.unknown()) }).passthrough())
    .mutation(async ({ ctx, input }) => {
      return callFiber(() => tiktokSongDetails({ body: { apiKey: ctx.apiKey, songUrl: input.songUrl } }));
    }),

  songVideos: protectedProcedure
    .input(z.object({ songUrl: z.string().trim().url(), nextPageToken: z.string().nullable().optional() }))
    .output(videosOutput)
    .mutation(async ({ ctx, input }) => {
      return callFiber(() => tiktokSongVideos({ body: { apiKey: ctx.apiKey, songUrl: input.songUrl, nextPageToken: input.nextPageToken ?? null } }));
    }),
});
