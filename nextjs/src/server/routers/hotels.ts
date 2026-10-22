import { z } from "zod";
import { hotelSearch, hotelProperty, bookingSearch, bookingProperty } from "@fiberai/sdk";
import { createTRPCRouter, protectedProcedure, callFiber } from "../trpc";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");
const passthrough = z.object({ output: z.record(z.unknown()) }).passthrough();
const sortBy = z.enum(["relevance", "lowestPrice", "highestRating", "mostReviewed"]).optional();

const stay = {
  checkInDate: isoDate,
  checkOutDate: isoDate,
  adults: z.number().int().min(1).max(12).default(2),
  currencyCode: z.string().length(3).default("USD"),
};

export const hotelsRouter = createTRPCRouter({
  /** Google Hotels search — hotels or vacation rentals. */
  search: protectedProcedure
    .input(z.object({
      query: z.string().trim().min(2),
      ...stay,
      sortBy,
      minRating: z.enum(["3.5", "4.0", "4.5"]).optional(),
      maxPerNight: z.number().positive().optional(),
      propertyCategory: z.enum(["hotel", "vacationRental"]).default("hotel"),
      hotelStarClasses: z.array(z.number().int().min(2).max(5)).optional(),
      freeCancellation: z.boolean().optional(),
      minBedrooms: z.number().int().min(1).optional(),
      nextPageToken: z.string().nullable().optional(),
    }))
    .output(passthrough)
    .mutation(async ({ ctx, input }) => {
      const category = input.propertyCategory === "vacationRental"
        ? { propertyCategory: "vacationRental" as const, minBedrooms: input.minBedrooms ?? null }
        : {
          propertyCategory: "hotel" as const,
          hotelStarClasses: input.hotelStarClasses?.length ? input.hotelStarClasses : null,
          freeCancellation: input.freeCancellation || undefined,
        };
      return callFiber(() => hotelSearch({
        body: {
          apiKey: ctx.apiKey,
          query: input.query,
          checkInDate: input.checkInDate,
          checkOutDate: input.checkOutDate,
          adults: input.adults,
          currencyCode: input.currencyCode,
          sortBy: input.sortBy ?? null,
          minRating: input.minRating ?? null,
          priceRange: input.maxPerNight ? { maxPerNight: input.maxPerNight } : null,
          category,
          nextPageToken: input.nextPageToken ?? null,
        },
      }));
    }),

  property: protectedProcedure
    .input(z.object({ propertyToken: z.string().min(1), ...stay }))
    .output(passthrough)
    .query(async ({ ctx, input }) => {
      return callFiber(() => hotelProperty({ body: { apiKey: ctx.apiKey, ...input } }));
    }),

  /** Booking.com search. */
  bookingSearch: protectedProcedure
    .input(z.object({
      query: z.string().trim().min(2),
      ...stay,
      rooms: z.number().int().min(1).max(8).default(1),
      sortBy,
      hotelStarClasses: z.array(z.number().int().min(1).max(5)).optional(),
      nextPageToken: z.string().nullable().optional(),
    }))
    .output(passthrough)
    .mutation(async ({ ctx, input }) => {
      return callFiber(() => bookingSearch({
        body: {
          apiKey: ctx.apiKey,
          query: input.query,
          checkInDate: input.checkInDate,
          checkOutDate: input.checkOutDate,
          adults: input.adults,
          rooms: input.rooms,
          currencyCode: input.currencyCode,
          sortBy: input.sortBy ?? null,
          hotelStarClasses: input.hotelStarClasses?.length ? input.hotelStarClasses : null,
          nextPageToken: input.nextPageToken ?? null,
        },
      }));
    }),

  bookingProperty: protectedProcedure
    .input(z.object({ propertyUrl: z.string().url() }))
    .output(passthrough)
    .query(async ({ ctx, input }) => {
      return callFiber(() => bookingProperty({ body: { apiKey: ctx.apiKey, propertyUrl: input.propertyUrl } }));
    }),
});
