import { z } from "zod";
import { fetchRealEstateListings } from "@fiberai/sdk";
import { createTRPCRouter, protectedProcedure, callFiber } from "../trpc";

export const realEstateRouter = createTRPCRouter({
  search: protectedProcedure
    .input(z.object({
      location: z.discriminatedUnion("mode", [
        z.object({ mode: z.literal("raw"), value: z.string().trim().min(1) }),
        z.object({ mode: z.literal("structured"), city: z.string().trim().min(1), stateCode: z.string().trim().min(2).max(2) }),
      ]),
      listingStatus: z.enum(["forSale", "forRent", "sold"]).optional(),
      minPrice: z.number().int().min(0).optional(),
      maxPrice: z.number().int().min(0).optional(),
      minBeds: z.number().int().min(0).max(10).optional(),
      nextPageToken: z.string().nullable().optional(),
    }))
    .output(z.object({
      output: z.object({
        properties: z.array(z.record(z.unknown())).optional(),
        totalCount: z.number().nullable().optional(),
        nextPageToken: z.string().nullable().optional(),
      }).passthrough(),
    }).passthrough())
    .mutation(async ({ ctx, input }) => {
      const location = input.location.mode === "raw"
        ? { type: "raw" as const, rawQuery: input.location.value }
        : { type: "structured" as const, city: input.location.city, stateCode: input.location.stateCode };
      return callFiber(() => fetchRealEstateListings({
        body: {
          apiKey: ctx.apiKey,
          location,
          listingStatus: input.listingStatus,
          price: (input.minPrice != null || input.maxPrice != null)
            ? { min: input.minPrice ?? null, max: input.maxPrice ?? null }
            : undefined,
          bedrooms: input.minBeds != null ? { min: input.minBeds, max: null } : undefined,
          nextPageToken: input.nextPageToken ?? null,
        } as Record<string, unknown> as never,
      }));
    }),
});
