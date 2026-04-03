import { z } from "zod";
import {
  googleMapsSearch,
  checkGoogleMapsResults,
  pollGoogleMapsResults,
  domainLookupTrigger,
  domainLookupPolling,
  githubLookupTrigger,
  githubLookupPolling,
  githubToLinkedInTrigger,
  githubToLinkedInPolling,
  startLocalBusinessSearch,
  pollLocalBusinessSearch,
} from "@fiberai/sdk";
import { createTRPCRouter, protectedProcedure, callFiber } from "../trpc";

const mapsStartSchema = z.object({ output: z.object({ searchID: z.string() }).passthrough() }).passthrough();

const mapsCheckSchema = z.object({
  output: z.object({
    status: z.string(), totalPlacesFound: z.number(), percentageCompleted: z.number(),
    totalPlacesRequested: z.number().optional(),
  }).passthrough(),
}).passthrough();

const mapsResultSchema = z.object({
  output: z.object({
    results: z.array(z.object({
      placeId: z.string(), name: z.string(), address: z.string().nullable().optional(),
      website: z.string().nullable().optional(), rating: z.number().nullable().optional(),
      numReviews: z.number().nullable().optional(), phoneNumber: z.string().nullable().optional(),
      primaryType: z.string().nullable().optional(), priceLevel: z.string().nullable().optional(),
      googleMapsURL: z.string(),
    }).passthrough()),
    nextCursor: z.string().nullable().optional(),
  }).passthrough(),
}).passthrough();

const domainTriggerSchema = z.object({ output: z.object({ domainAgentRunId: z.string() }).passthrough() }).passthrough();

const domainPollSchema = z.object({
  output: z.object({
    status: z.string(),
    data: z.array(z.object({
      companyName: z.string(), bestDomain: z.string().nullable().optional(),
      confidence: z.number().nullable().optional(), rationale: z.string(),
      allDomains: z.array(z.string()).nullable().optional(),
    }).passthrough()),
    nextCursor: z.string().nullable().optional(), hasMore: z.boolean().optional(),
  }).passthrough(),
}).passthrough();

const githubTriggerSchema = z.object({ output: z.object({ githubAgentRunId: z.string() }).passthrough() }).passthrough();

const githubPollSchema = z.object({
  output: z.object({
    status: z.string(), results: z.array(z.record(z.unknown())).optional(),
  }).passthrough(),
}).passthrough();

export const toolsRouter = createTRPCRouter({
  startGoogleMapsSearch: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1),
        maxResults: z.number().min(1).max(500).default(100),
        strategy: z.discriminatedUnion("strategy", [
          z.object({
            strategy: z.literal("whole-usa"),
          }),
          z.object({
            strategy: z.literal("specific-areas"),
            unionAll: z.array(
              z.object({
                regionType: z.literal("circle"),
                center: z.object({
                  latitude: z.number(),
                  longitude: z.number(),
                }),
              })
            ),
          }),
        ]),
      })
    )
    .output(mapsStartSchema)
    .mutation(async ({ ctx, input }) => {
      return callFiber(() =>
        googleMapsSearch({
          body: {
            apiKey: ctx.apiKey,
            query: input.query,
            maxResults: input.maxResults,
            strategy: input.strategy,
          },
        })
      );
    }),

  checkGoogleMapsResults: protectedProcedure
    .input(z.object({ searchID: z.string() }))
    .output(mapsCheckSchema)
    .query(async ({ ctx, input }) => {
      return callFiber(() =>
        checkGoogleMapsResults({
          body: {
            apiKey: ctx.apiKey,
            searchID: input.searchID,
          },
        })
      );
    }),

  pollGoogleMapsResults: protectedProcedure
    .input(
      z.object({
        searchID: z.string(),
        pageSize: z.number().min(1).max(100).default(25),
        cursor: z.string().nullable().optional(),
      })
    )
    .output(mapsResultSchema)
    .query(async ({ ctx, input }) => {
      return callFiber(() =>
        pollGoogleMapsResults({
          body: {
            apiKey: ctx.apiKey,
            searchID: input.searchID,
            pageSize: input.pageSize,
            cursor: input.cursor ?? null,
          },
        })
      );
    }),

  triggerDomainLookup: protectedProcedure
    .input(
      z.object({
        overAllContext: z.string().default(""),
        companyInfo: z.array(
          z.object({
            name: z.string(),
            domain: z.string().nullable().optional(),
            country: z.string().nullable().optional(),
            city: z.string().nullable().optional(),
            otherContext: z.string().nullable().optional(),
          })
        ),
      })
    )
    .output(domainTriggerSchema)
    .mutation(async ({ ctx, input }) => {
      return callFiber(() =>
        domainLookupTrigger({
          body: {
            apiKey: ctx.apiKey,
            overAllContext: input.overAllContext,
            companyInfo: input.companyInfo,
          },
        })
      );
    }),

  // --- GitHub Lookups ---
  triggerGithubLookup: protectedProcedure
    .input(z.object({
      overallContext: z.string().default(""),
      people: z.array(z.object({ linkedinUrl: z.string(), externalId: z.string().nullable().optional() })),
    }))
    .output(githubTriggerSchema)
    .mutation(async ({ ctx, input }) => {
      return callFiber(() => githubLookupTrigger({
        body: {
          apiKey: ctx.apiKey, overallContext: input.overallContext,
          people: input.people.map((p) => ({ inputType: "linkedinUrl" as const, linkedinUrl: p.linkedinUrl, externalId: p.externalId })),
        },
      }));
    }),

  pollGithubLookup: protectedProcedure
    .input(z.object({ githubAgentRunId: z.string(), cursor: z.string().nullable().optional(), pageSize: z.number().default(25) }))
    .output(githubPollSchema)
    .query(async ({ ctx, input }) => {
      return callFiber(() => githubLookupPolling({ body: { apiKey: ctx.apiKey, githubAgentRunId: input.githubAgentRunId, cursor: input.cursor ?? undefined, pageSize: input.pageSize } }));
    }),

  triggerGithubToLinkedIn: protectedProcedure
    .input(z.object({
      people: z.array(z.object({ githubUsername: z.string(), customerProvidedId: z.string().nullable().optional() })),
      outputType: z.enum(["linkedin", "email", "both"]).default("linkedin"),
    }))
    .output(githubTriggerSchema)
    .mutation(async ({ ctx, input }) => {
      return callFiber(() => githubToLinkedInTrigger({ body: { apiKey: ctx.apiKey, people: input.people, outputType: input.outputType } }));
    }),

  pollGithubToLinkedIn: protectedProcedure
    .input(z.object({ githubAgentRunId: z.string(), cursor: z.string().nullable().optional(), pageSize: z.number().default(25) }))
    .output(githubPollSchema)
    .query(async ({ ctx, input }) => {
      return callFiber(() => githubToLinkedInPolling({ body: { apiKey: ctx.apiKey, githubAgentRunId: input.githubAgentRunId, cursor: input.cursor ?? undefined, pageSize: input.pageSize } }));
    }),

  // --- Local Business Search ---
  startLocalBusinessSearch: protectedProcedure
    .input(z.object({
      companies: z.array(z.object({
        companyName: z.string(),
        domain: z.string().nullable().optional(),
        country: z.string().nullable().optional(),
        state: z.string().nullable().optional(),
        city: z.string().nullable().optional(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      return callFiber(() => startLocalBusinessSearch({
        body: { apiKey: ctx.apiKey, data: [{ source: "custom" as const, companies: input.companies }] },
      }));
    }),

  pollLocalBusinessSearch: protectedProcedure
    .input(z.object({ taskId: z.string(), pageSize: z.number().min(1).max(100).default(25), cursor: z.string().nullable().optional() }))
    .query(async ({ ctx, input }) => {
      return callFiber(() => pollLocalBusinessSearch({
        body: { apiKey: ctx.apiKey, taskId: input.taskId, pageSize: input.pageSize, cursor: input.cursor ?? null },
      }));
    }),

  pollDomainLookup: protectedProcedure
    .input(
      z.object({
        domainAgentRunId: z.string(),
        cursor: z.string().nullable().optional(),
        pageSize: z.number().min(1).max(100).default(25),
      })
    )
    .output(domainPollSchema)
    .query(async ({ ctx, input }) => {
      return callFiber(() =>
        domainLookupPolling({
          body: {
            apiKey: ctx.apiKey,
            domainAgentRunId: input.domainAgentRunId,
            cursor: input.cursor ?? undefined,
            pageSize: input.pageSize,
          },
        })
      );
    }),
});
