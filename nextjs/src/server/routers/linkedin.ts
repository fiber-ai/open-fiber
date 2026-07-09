import { z } from "zod";
import {
  profileLiveEnrich, companyLiveEnrich, reverseEmailLookup,
  profilePostsLiveFetch, companyPostsLiveFetch, postSearchByKeywords,
  postCommentsLiveFetch, postReactionsLiveFetch,
  profileCommentsLiveFetch, profileReactionsLiveFetch,
  kitchenSinkProfile, kitchenSinkCompany, kitchenSinkBulkCompany,
  standardizeProfile, standardizeCompany,
  startBatchLiveEnrich, pollBatchLiveEnrich,
} from "@fiberai/sdk";
import { createTRPCRouter, protectedProcedure, callFiber } from "../trpc";

// Person fields shared by reverse email and kitchen sink results
const personFields = z.object({
  first_name: z.string().nullable().optional(),
  last_name: z.string().nullable().optional(),
  name: z.string().nullable().optional(),
  headline: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
  profile_pic: z.string().nullable().optional(),
  primary_slug: z.string().nullable().optional(),
  locality: z.string().nullable().optional(),
  industry_name: z.string().nullable().optional(),
  connection_count: z.number().nullable().optional(),
  current_job: z.object({ title: z.string().nullable().optional(), company_name: z.string().nullable().optional() }).passthrough().nullable().optional(),
  skills: z.array(z.string()).nullable().optional(),
  tags: z.array(z.string()).nullable().optional(),
  experiences: z.array(z.any()).nullable().optional(),
  education: z.array(z.any()).nullable().optional(),
  open_to_work: z.boolean().nullable().optional(),
}).passthrough();

const kitchenSinkPersonFields = z.object({
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  company: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  linkedinUrl: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
}).passthrough();

// Output types — these define what the client receives
const profileLiveOutput = z.object({ output: z.object({ found: z.boolean(), profile: z.any() }).passthrough() }).passthrough();
const companyLiveOutput = z.object({ output: z.object({ company: z.any() }).passthrough() }).passthrough();
const reverseEmailOutput = z.object({ output: z.object({ data: z.array(personFields) }).passthrough() }).passthrough();
const postsOutput = z.object({ output: z.object({ data: z.array(z.any()), cursor: z.string().nullable().optional() }).passthrough() }).passthrough();
const keywordPostsOutput = z.object({ output: z.object({ posts: z.array(z.any()), cursor: z.string().nullable().optional() }).passthrough() }).passthrough();
const kitchenSinkOutput = z.object({ output: kitchenSinkPersonFields }).passthrough();

// Helper: cast SDK result to match output schema
function asOutput<T>(data: unknown): T { return data as T; }

export const linkedinRouter = createTRPCRouter({
  profileLiveEnrich: protectedProcedure
    .input(z.object({ identifier: z.string(), getDetailedEducation: z.boolean().optional(), getDetailedWorkExperience: z.boolean().optional() }))
    .output(profileLiveOutput)
    .mutation(async ({ ctx, input }) => {
      const data = await callFiber(() =>
        profileLiveEnrich({ body: { apiKey: ctx.apiKey, identifier: input.identifier, getDetailedEducation: input.getDetailedEducation ?? null, getDetailedWorkExperience: input.getDetailedWorkExperience ?? null } })
      );
      return asOutput<z.infer<typeof profileLiveOutput>>(data);
    }),

  companyLiveEnrich: protectedProcedure
    .input(z.object({ type: z.enum(["slug", "orgId", "liUrl"]), value: z.string() }))
    .output(companyLiveOutput)
    .mutation(async ({ ctx, input }) => {
      const data = await callFiber(() => companyLiveEnrich({ body: { apiKey: ctx.apiKey, type: input.type, value: input.value } }));
      return asOutput<z.infer<typeof companyLiveOutput>>(data);
    }),

  reverseEmailLookup: protectedProcedure
    .input(z.object({ email: z.string().email() }))
    .output(reverseEmailOutput)
    .mutation(async ({ ctx, input }) => {
      const data = await callFiber(() => reverseEmailLookup({ body: { apiKey: ctx.apiKey, email: input.email } }));
      return asOutput<z.infer<typeof reverseEmailOutput>>(data);
    }),

  profilePosts: protectedProcedure
    .input(z.object({ identifier: z.string(), cursor: z.string().nullable().optional() }))
    .output(postsOutput)
    .mutation(async ({ ctx, input }) => {
      const data = await callFiber(() => profilePostsLiveFetch({ body: { apiKey: ctx.apiKey, identifier: input.identifier, cursor: input.cursor ?? undefined } }));
      return asOutput<z.infer<typeof postsOutput>>(data);
    }),

  companyPosts: protectedProcedure
    .input(z.object({ identifier: z.string(), cursor: z.string().nullable().optional() }))
    .output(postsOutput)
    .mutation(async ({ ctx, input }) => {
      const data = await callFiber(() => companyPostsLiveFetch({ body: { apiKey: ctx.apiKey, identifier: input.identifier, cursor: input.cursor ?? undefined } }));
      return asOutput<z.infer<typeof postsOutput>>(data);
    }),

  postSearchByKeywords: protectedProcedure
    .input(z.object({ keywords: z.string().min(1), recency: z.enum(["Day", "Week", "Month", "Quarter", "HalfYear", "Year"]).nullable().optional(), cursor: z.string().nullable().optional() }))
    .output(keywordPostsOutput)
    .mutation(async ({ ctx, input }) => {
      const data = await callFiber(() => postSearchByKeywords({ body: { apiKey: ctx.apiKey, keywords: input.keywords, recency: input.recency ?? null, cursor: input.cursor ?? undefined } }));
      return asOutput<z.infer<typeof keywordPostsOutput>>(data);
    }),

  postComments: protectedProcedure
    .input(z.object({ postUrn: z.string(), cursor: z.string().nullable().optional() }))
    .mutation(async ({ ctx, input }) => {
      return callFiber(() => postCommentsLiveFetch({ body: { apiKey: ctx.apiKey, contentId: input.postUrn, cursor: input.cursor ?? undefined } }));
    }),

  postReactions: protectedProcedure
    .input(z.object({ postUrn: z.string(), cursor: z.string().nullable().optional() }))
    .mutation(async ({ ctx, input }) => {
      return callFiber(() => postReactionsLiveFetch({ body: { apiKey: ctx.apiKey, contentId: input.postUrn, cursor: input.cursor ?? undefined } }));
    }),

  profileComments: protectedProcedure
    .input(z.object({ identifier: z.string(), cursor: z.string().nullable().optional() }))
    .output(postsOutput)
    .mutation(async ({ ctx, input }) => {
      const data = await callFiber(() => profileCommentsLiveFetch({ body: { apiKey: ctx.apiKey, identifier: input.identifier, cursor: input.cursor ?? undefined } }));
      return asOutput<z.infer<typeof postsOutput>>(data);
    }),

  profileReactions: protectedProcedure
    .input(z.object({ identifier: z.string(), cursor: z.string().nullable().optional() }))
    .output(postsOutput)
    .mutation(async ({ ctx, input }) => {
      const data = await callFiber(() => profileReactionsLiveFetch({ body: { apiKey: ctx.apiKey, identifier: input.identifier, cursor: input.cursor ?? undefined } }));
      return asOutput<z.infer<typeof postsOutput>>(data);
    }),

  kitchenSinkProfile: protectedProcedure
    .input(z.object({
      profileIdentifier: z.object({ identifier: z.enum(["linkedinSlug", "linkedinUrl", "userID"]), value: z.string() }).nullable().optional(),
      emailAddress: z.string().nullable().optional(),
      personName: z.object({ value: z.string().nullable().optional(), looseMatch: z.boolean().optional() }).nullable().optional(),
    }))
    .output(kitchenSinkOutput)
    .mutation(async ({ ctx, input }) => {
      const data = await callFiber(() => kitchenSinkProfile({ body: { apiKey: ctx.apiKey, profileIdentifier: input.profileIdentifier ?? null, emailAddress: input.emailAddress ?? null, personName: input.personName ?? null } }));
      return asOutput<z.infer<typeof kitchenSinkOutput>>(data);
    }),

  kitchenSinkCompany: protectedProcedure
    .input(z.object({
      companyIdentifier: z.object({ identifier: z.enum(["linkedinSlug", "linkedinUrl", "linkedinOrgID"]), value: z.string() }).nullable().optional(),
      companyName: z.object({ value: z.string().nullable().optional() }).nullable().optional(),
      companyDomain: z.object({ value: z.string().nullable().optional() }).nullable().optional(),
    }))
    .output(kitchenSinkOutput)
    .mutation(async ({ ctx, input }) => {
      const data = await callFiber(() => kitchenSinkCompany({ body: { apiKey: ctx.apiKey, companyIdentifier: input.companyIdentifier ?? null, companyName: input.companyName ?? null, companyDomain: input.companyDomain ?? null } }));
      return asOutput<z.infer<typeof kitchenSinkOutput>>(data);
    }),

  // --- Bulk Company Lookup (for CSV import) ---
  kitchenSinkBulkCompany: protectedProcedure
    .input(z.object({
      companies: z.array(z.object({
        companyIdentifier: z.object({
          identifier: z.enum(["linkedinSlug", "linkedinUrl", "linkedinOrgID"]),
          value: z.string(),
        }).nullable().optional(),
        companyName: z.object({ value: z.string().nullable().optional() }).nullable().optional(),
        companyDomain: z.object({ value: z.string().nullable().optional() }).nullable().optional(),
      })).min(1).max(10000),
    }))
    .output(z.object({ output: z.record(z.unknown()) }).passthrough())
    .mutation(async ({ ctx, input }) => {
      const data = await callFiber(() => kitchenSinkBulkCompany({
        body: {
          apiKey: ctx.apiKey,
          companies: input.companies.map((c) => ({
            companyIdentifier: c.companyIdentifier ?? undefined,
            companyName: c.companyName ?? undefined,
            companyDomain: c.companyDomain ?? undefined,
          })),
        },
      }));
      return asOutput<{ output: Record<string, unknown> }>(data);
    }),

  // --- Bulk Live Enrich (async batch) ---
  startBatchLiveEnrich: protectedProcedure
    .input(z.object({
      type: z.enum(["PROFILE", "COMPANY"]),
      identifiers: z.array(z.string().trim().min(1)).min(1).max(1000),
    }))
    .output(z.object({ output: z.object({ taskId: z.string() }).passthrough() }).passthrough())
    .mutation(async ({ ctx, input }) => {
      return callFiber(() => startBatchLiveEnrich({ body: { apiKey: ctx.apiKey, type: input.type, identifiers: input.identifiers } }));
    }),

  pollBatchLiveEnrich: protectedProcedure
    .input(z.object({ taskId: z.string(), cursor: z.string().nullable().optional(), take: z.number().int().min(1).max(100).default(100) }))
    .output(z.object({ output: z.object({
      status: z.string(),
      results: z.array(z.record(z.unknown())).optional(),
      nextCursor: z.string().nullable().optional(),
    }).passthrough() }).passthrough())
    .query(async ({ ctx, input }) => {
      return callFiber(() => pollBatchLiveEnrich({ body: { apiKey: ctx.apiKey, taskId: input.taskId, cursor: input.cursor ?? null, take: input.take } }));
    }),

  // --- Standardize URLs ---
  standardizeProfile: protectedProcedure
    .input(z.object({ identifier: z.string().min(1) }))
    .output(z.object({ output: z.record(z.unknown()) }).passthrough())
    .mutation(async ({ ctx, input }) => {
      return callFiber(() => standardizeProfile({ body: { apiKey: ctx.apiKey, identifier: input.identifier } }));
    }),

  standardizeCompany: protectedProcedure
    .input(z.object({ identifier: z.string().min(1) }))
    .output(z.object({ output: z.record(z.unknown()) }).passthrough())
    .mutation(async ({ ctx, input }) => {
      return callFiber(() => standardizeCompany({ body: { apiKey: ctx.apiKey, identifier: input.identifier } }));
    }),
});
