import { z } from "zod";
import {
  googleMapsSearch,
  checkGoogleMapsResults,
  pollGoogleMapsResults,
  domainLookupTrigger,
  domainLookupPolling,
  githubLookupTrigger,
  githubLookupPoll,
  githubToLinkedInTrigger,
  githubToLinkedInPolling,
  startLocalBusinessSearch,
  pollLocalBusinessSearch,
  getScoutingReport,
  getCompanyRevenue,
  socialMediaLookupBatchTrigger,
  socialMediaLookupBatchPolling,
  webpageScreenshot,
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
    status: z.string().optional(),
    overallStatus: z.string().optional(),
    results: z.array(z.record(z.unknown())).optional(),
    people: z.array(z.record(z.unknown())).optional(),
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
      return callFiber(() => githubLookupPoll({ body: { apiKey: ctx.apiKey, githubAgentRunId: input.githubAgentRunId } }));
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
        body: {
          apiKey: ctx.apiKey,
          companies: input.companies.map((c) => ({
            companyName: c.companyName,
            companyWebsite: c.domain ?? null,
            companyCity: c.city ?? null,
            companyState: c.state ?? null,
            companyCountryName: c.country ?? null,
          })),
        },
      }));
    }),

  pollLocalBusinessSearch: protectedProcedure
    .input(z.object({ taskId: z.string(), pageSize: z.number().min(1).max(100).default(25), cursor: z.string().nullable().optional() }))
    .query(async ({ ctx, input }) => {
      return callFiber(() => pollLocalBusinessSearch({
        body: { apiKey: ctx.apiKey, researchRunId: input.taskId, pageSize: input.pageSize, cursor: input.cursor ?? null },
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

  // --- Scouting Report (AI Research) ---
  getScoutingReport: protectedProcedure
    .input(z.object({
      identifier: z.enum(["linkedinUrl", "linkedinSlug", "linkedinOrgId", "domain"] as const),
      value: z.string().min(1),
    }))
    .output(z.object({ output: z.record(z.unknown()) }).passthrough())
    .mutation(async ({ ctx, input }) => {
      return callFiber(() => getScoutingReport({
        body: { apiKey: ctx.apiKey, company: { identifier: input.identifier, value: input.value } },
      }));
    }),

  // --- Revenue Intelligence ---
  getCompanyRevenue: protectedProcedure
    .input(z.object({
      name: z.string().optional(),
      domain: z.string().optional(),
      linkedinUrl: z.string().optional(),
      linkedinOrgId: z.string().optional(),
    }))
    .output(z.object({ output: z.record(z.unknown()) }).passthrough())
    .mutation(async ({ ctx, input }) => {
      return callFiber(() => getCompanyRevenue({
        body: {
          apiKey: ctx.apiKey,
          companyMetadata: {
            ...(input.name ? { name: input.name } : {}),
            ...(input.domain ? { domain: input.domain } : {}),
            ...(input.linkedinUrl ? { linkedinUrl: input.linkedinUrl } : {}),
            ...(input.linkedinOrgId ? { linkedinOrgId: input.linkedinOrgId } : {}),
          },
        },
      }));
    }),

  // --- Social Media Lookup (async batch) ---
  triggerSocialMediaLookup: protectedProcedure
    .input(z.object({
      people: z.array(z.object({
        linkedinUrl: z.string().min(1),
      })).min(1),
      platforms: z.array(z.enum(["TWITTER", "INSTAGRAM"])).optional(),
    }))
    .output(z.object({ output: z.object({ runId: z.string() }).passthrough() }).passthrough())
    .mutation(async ({ ctx, input }) => {
      return callFiber(() => socialMediaLookupBatchTrigger({
        body: {
          apiKey: ctx.apiKey,
          platforms: input.platforms,
          people: input.people.map((p) => ({ inputType: "linkedinUrl" as const, linkedinUrl: p.linkedinUrl })),
        },
      }));
    }),

  pollSocialMediaLookup: protectedProcedure
    .input(z.object({
      runId: z.string(),
      nextPageToken: z.string().nullable().optional(),
      pageSize: z.number().int().min(1).max(100).default(25),
    }))
    .output(z.object({
      output: z.object({
        status: z.string(),
        results: z.array(z.record(z.unknown())).optional(),
        nextPageToken: z.string().nullable().optional(),
      }).passthrough(),
    }).passthrough())
    .query(async ({ ctx, input }) => {
      return callFiber(() => socialMediaLookupBatchPolling({
        body: { apiKey: ctx.apiKey, runId: input.runId, nextPageToken: input.nextPageToken ?? undefined, pageSize: input.pageSize },
      }));
    }),

  // --- Webpage Screenshot ---
  webpageScreenshot: protectedProcedure
    .input(z.object({
      url: z.string().trim().min(1),
      fullPage: z.boolean().optional(),
      format: z.enum(["mobile", "desktop"]).optional(),
    }))
    .output(z.object({ output: z.object({ screenshotUrl: z.string(), title: z.string().nullable().optional() }).passthrough() }).passthrough())
    .mutation(async ({ ctx, input }) => {
      return callFiber(() => webpageScreenshot({
        body: { apiKey: ctx.apiKey, url: input.url, fullPage: input.fullPage, format: input.format },
      }));
    }),
});
