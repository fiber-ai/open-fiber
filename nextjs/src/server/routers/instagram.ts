import { z } from "zod";
import {
  instagramProfile,
  instagramUserPosts,
  instagramUserReels,
  instagramPostDetails,
  instagramPostComments,
} from "@fiberai/sdk";
import { createTRPCRouter, protectedProcedure, callFiber } from "../trpc";

const handleInput = z.object({ handle: z.string().trim().min(1) });
const handleWithToken = handleInput.extend({ nextPageToken: z.string().nullable().optional() });
const postsOutput = z.object({
  output: z.object({
    posts: z.array(z.record(z.unknown())).optional(),
    reels: z.array(z.record(z.unknown())).optional(),
    nextPageToken: z.string().nullable().optional(),
  }).passthrough(),
}).passthrough();

export const instagramRouter = createTRPCRouter({
  profile: protectedProcedure
    .input(handleInput)
    .output(z.object({ output: z.record(z.unknown()) }).passthrough())
    .mutation(async ({ ctx, input }) => {
      return callFiber(() => instagramProfile({ body: { apiKey: ctx.apiKey, handle: input.handle } }));
    }),

  userPosts: protectedProcedure
    .input(handleWithToken)
    .output(postsOutput)
    .mutation(async ({ ctx, input }) => {
      return callFiber(() => instagramUserPosts({ body: { apiKey: ctx.apiKey, handle: input.handle, nextPageToken: input.nextPageToken ?? null } }));
    }),

  userReels: protectedProcedure
    .input(handleWithToken)
    .output(postsOutput)
    .mutation(async ({ ctx, input }) => {
      return callFiber(() => instagramUserReels({ body: { apiKey: ctx.apiKey, handle: input.handle, nextPageToken: input.nextPageToken ?? null } }));
    }),

  postDetails: protectedProcedure
    .input(z.object({ postUrl: z.string().trim().min(1) }))
    .output(z.object({ output: z.record(z.unknown()) }).passthrough())
    .mutation(async ({ ctx, input }) => {
      return callFiber(() => instagramPostDetails({ body: { apiKey: ctx.apiKey, postUrl: input.postUrl } }));
    }),

  postComments: protectedProcedure
    .input(z.object({ postUrl: z.string().trim().min(1), nextPageToken: z.string().nullable().optional() }))
    .output(z.object({ output: z.record(z.unknown()) }).passthrough())
    .mutation(async ({ ctx, input }) => {
      return callFiber(() => instagramPostComments({ body: { apiKey: ctx.apiKey, postUrl: input.postUrl, nextPageToken: input.nextPageToken ?? null } }));
    }),
});
