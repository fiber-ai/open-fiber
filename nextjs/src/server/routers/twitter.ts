import { z } from "zod";
import {
  twitterProfile,
  twitterSearch,
  twitterUserTweets,
  twitterUserFollowers,
  twitterUserFollowing,
  twitterUserMentions,
  twitterTweetDetails,
  twitterTweetReplies,
  twitterTweetQuotes,
  twitterTweetRetweeters,
} from "@fiberai/sdk";
import { createTRPCRouter, protectedProcedure, callFiber } from "../trpc";

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
      return callFiber(() => twitterProfile({ body: { apiKey: ctx.apiKey, handle: input.handle } }));
    }),

  search: protectedProcedure
    .input(z.object({ query: z.string().min(1), cursor: z.string().nullable().optional() }))
    .output(paginatedOutput)
    .mutation(async ({ ctx, input }) => {
      return callFiber(() => twitterSearch({ body: { apiKey: ctx.apiKey, query: input.query, cursor: input.cursor ?? null } }));
    }),

  getUserTweets: protectedProcedure
    .input(handleWithCursor)
    .output(paginatedOutput)
    .mutation(async ({ ctx, input }) => {
      return callFiber(() => twitterUserTweets({ body: { apiKey: ctx.apiKey, handle: input.handle, cursor: input.cursor ?? null } }));
    }),

  getUserFollowers: protectedProcedure
    .input(handleWithCursor)
    .output(paginatedOutput)
    .mutation(async ({ ctx, input }) => {
      return callFiber(() => twitterUserFollowers({ body: { apiKey: ctx.apiKey, handle: input.handle, cursor: input.cursor ?? null } }));
    }),

  getUserFollowing: protectedProcedure
    .input(handleWithCursor)
    .output(paginatedOutput)
    .mutation(async ({ ctx, input }) => {
      return callFiber(() => twitterUserFollowing({ body: { apiKey: ctx.apiKey, handle: input.handle, cursor: input.cursor ?? null } }));
    }),

  getUserMentions: protectedProcedure
    .input(handleWithCursor)
    .output(paginatedOutput)
    .mutation(async ({ ctx, input }) => {
      return callFiber(() => twitterUserMentions({ body: { apiKey: ctx.apiKey, handle: input.handle, cursor: input.cursor ?? null } }));
    }),

  getTweetDetails: protectedProcedure
    .input(tweetIdInput)
    .output(genericOutput)
    .mutation(async ({ ctx, input }) => {
      return callFiber(() => twitterTweetDetails({ body: { apiKey: ctx.apiKey, tweetId: input.tweetId } }));
    }),

  getTweetReplies: protectedProcedure
    .input(tweetIdWithCursor)
    .output(paginatedOutput)
    .mutation(async ({ ctx, input }) => {
      return callFiber(() => twitterTweetReplies({ body: { apiKey: ctx.apiKey, tweetId: input.tweetId, cursor: input.cursor ?? null } }));
    }),

  getTweetQuotes: protectedProcedure
    .input(tweetIdWithCursor)
    .output(paginatedOutput)
    .mutation(async ({ ctx, input }) => {
      return callFiber(() => twitterTweetQuotes({ body: { apiKey: ctx.apiKey, tweetId: input.tweetId, cursor: input.cursor ?? null } }));
    }),

  getTweetRetweeters: protectedProcedure
    .input(tweetIdWithCursor)
    .output(paginatedOutput)
    .mutation(async ({ ctx, input }) => {
      return callFiber(() => twitterTweetRetweeters({ body: { apiKey: ctx.apiKey, tweetId: input.tweetId, cursor: input.cursor ?? null } }));
    }),
});
