import { z } from "zod";
import { createTRPCRouter, protectedProcedure, fiberFetch } from "../trpc";

/**
 * Twitter/X endpoints are not yet in @fiberai/sdk v0.0.5.
 * Using fiberFetch() for direct API calls. When the SDK adds these,
 * swap fiberFetch to SDK calls — no schema changes needed.
 */

// --- Shared output schemas ---

const genericOutput = z.object({ output: z.record(z.unknown()) }).passthrough();

const paginatedOutput = z.object({
  output: z.object({
    data: z.array(z.record(z.unknown())).optional(),
    results: z.array(z.record(z.unknown())).optional(),
    cursor: z.string().nullable().optional(),
    nextCursor: z.string().nullable().optional(),
  }).passthrough(),
}).passthrough();

// --- Shared input fragments ---

const handleInput = z.object({ handle: z.string().min(1) });
const handleWithCursor = handleInput.extend({ cursor: z.string().nullable().optional() });
const tweetIdInput = z.object({ tweetId: z.string().min(1) });
const tweetIdWithCursor = tweetIdInput.extend({ cursor: z.string().nullable().optional() });

export const twitterRouter = createTRPCRouter({
  getProfile: protectedProcedure
    .input(handleInput)
    .output(genericOutput)
    .mutation(async ({ ctx, input }) => {
      return fiberFetch(ctx.apiKey, "POST", "/v1/twitter/profile", { handle: input.handle });
    }),

  search: protectedProcedure
    .input(z.object({ query: z.string().min(1), cursor: z.string().nullable().optional() }))
    .output(paginatedOutput)
    .mutation(async ({ ctx, input }) => {
      return fiberFetch(ctx.apiKey, "POST", "/v1/twitter/search", { query: input.query, cursor: input.cursor });
    }),

  getUserTweets: protectedProcedure
    .input(handleWithCursor)
    .output(paginatedOutput)
    .mutation(async ({ ctx, input }) => {
      return fiberFetch(ctx.apiKey, "POST", "/v1/twitter/user-tweets", { handle: input.handle, cursor: input.cursor });
    }),

  getUserFollowers: protectedProcedure
    .input(handleWithCursor)
    .output(paginatedOutput)
    .mutation(async ({ ctx, input }) => {
      return fiberFetch(ctx.apiKey, "POST", "/v1/twitter/user-followers", { handle: input.handle, cursor: input.cursor });
    }),

  getUserFollowing: protectedProcedure
    .input(handleWithCursor)
    .output(paginatedOutput)
    .mutation(async ({ ctx, input }) => {
      return fiberFetch(ctx.apiKey, "POST", "/v1/twitter/user-following", { handle: input.handle, cursor: input.cursor });
    }),

  getUserMentions: protectedProcedure
    .input(handleWithCursor)
    .output(paginatedOutput)
    .mutation(async ({ ctx, input }) => {
      return fiberFetch(ctx.apiKey, "POST", "/v1/twitter/user-mentions", { handle: input.handle, cursor: input.cursor });
    }),

  getTweetDetails: protectedProcedure
    .input(tweetIdInput)
    .output(genericOutput)
    .mutation(async ({ ctx, input }) => {
      return fiberFetch(ctx.apiKey, "POST", "/v1/twitter/tweet-details", { tweetId: input.tweetId });
    }),

  getTweetReplies: protectedProcedure
    .input(tweetIdWithCursor)
    .output(paginatedOutput)
    .mutation(async ({ ctx, input }) => {
      return fiberFetch(ctx.apiKey, "POST", "/v1/twitter/tweet-replies", { tweetId: input.tweetId, cursor: input.cursor });
    }),

  getTweetQuotes: protectedProcedure
    .input(tweetIdWithCursor)
    .output(paginatedOutput)
    .mutation(async ({ ctx, input }) => {
      return fiberFetch(ctx.apiKey, "POST", "/v1/twitter/tweet-quotes", { tweetId: input.tweetId, cursor: input.cursor });
    }),

  getTweetRetweeters: protectedProcedure
    .input(tweetIdWithCursor)
    .output(paginatedOutput)
    .mutation(async ({ ctx, input }) => {
      return fiberFetch(ctx.apiKey, "POST", "/v1/twitter/tweet-retweeters", { tweetId: input.tweetId, cursor: input.cursor });
    }),
});
