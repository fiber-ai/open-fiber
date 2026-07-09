import { z } from "zod";
import {
  redditSearch,
  redditSubredditPosts,
  redditSubredditSearch,
  redditPostComments,
} from "@fiberai/sdk";
import { createTRPCRouter, protectedProcedure, callFiber } from "../trpc";

const timeframeEnum = z.enum(["all", "day", "week", "month", "year"]);
const postsOutput = z.object({
  output: z.object({
    posts: z.array(z.record(z.unknown())).optional(),
    nextPageToken: z.string().nullable().optional(),
  }).passthrough(),
}).passthrough();

export const redditRouter = createTRPCRouter({
  search: protectedProcedure
    .input(z.object({
      query: z.string().trim().min(1),
      sort: z.enum(["relevance", "new", "top", "comment_count"]).optional(),
      timeframe: timeframeEnum.optional(),
      nextPageToken: z.string().nullable().optional(),
    }))
    .output(postsOutput)
    .mutation(async ({ ctx, input }) => {
      return callFiber(() => redditSearch({ body: { apiKey: ctx.apiKey, query: input.query, sort: input.sort, timeframe: input.timeframe, nextPageToken: input.nextPageToken ?? null } }));
    }),

  subredditPosts: protectedProcedure
    .input(z.object({
      subreddit: z.string().trim().min(1),
      sort: z.enum(["best", "hot", "new", "top", "rising"]).optional(),
      timeframe: timeframeEnum.optional(),
      nextPageToken: z.string().nullable().optional(),
    }))
    .output(postsOutput)
    .mutation(async ({ ctx, input }) => {
      return callFiber(() => redditSubredditPosts({ body: { apiKey: ctx.apiKey, subreddit: input.subreddit, sort: input.sort, timeframe: input.timeframe, nextPageToken: input.nextPageToken ?? null } }));
    }),

  subredditSearch: protectedProcedure
    .input(z.object({
      subreddit: z.string().trim().min(1),
      query: z.string().trim().min(1),
      sort: z.enum(["relevance", "hot", "top", "new", "comment_count"]).optional(),
      timeframe: timeframeEnum.optional(),
      nextPageToken: z.string().nullable().optional(),
    }))
    .output(postsOutput)
    .mutation(async ({ ctx, input }) => {
      return callFiber(() => redditSubredditSearch({ body: { apiKey: ctx.apiKey, subreddit: input.subreddit, query: input.query, sort: input.sort, timeframe: input.timeframe, nextPageToken: input.nextPageToken ?? null } }));
    }),

  postComments: protectedProcedure
    .input(z.object({ postUrlOrId: z.string().trim().min(1), nextPageToken: z.string().nullable().optional() }))
    .output(z.object({ output: z.record(z.unknown()) }).passthrough())
    .mutation(async ({ ctx, input }) => {
      return callFiber(() => redditPostComments({ body: { apiKey: ctx.apiKey, postUrlOrId: input.postUrlOrId, nextPageToken: input.nextPageToken ?? null } }));
    }),
});
