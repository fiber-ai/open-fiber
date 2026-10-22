import { z } from "zod";
import { flightSearch, flightDeals, flightBookingOptions } from "@fiberai/sdk";
import { createTRPCRouter, protectedProcedure, callFiber } from "../trpc";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");
const travelClass = z.enum(["economy", "premiumEconomy", "business", "first"]);
const passthrough = z.object({ output: z.record(z.unknown()) }).passthrough();

export const flightsRouter = createTRPCRouter({
  search: protectedProcedure
    .input(z.object({
      departureAirports: z.string().trim().min(2),
      arrivalAirports: z.string().trim().min(2),
      departureDate: isoDate,
      returnDate: isoDate.optional(),
      adults: z.number().int().min(1).max(9).default(1),
      travelClass: travelClass.optional(),
      maxStops: z.number().int().min(0).max(3).optional(),
      sortBy: z.enum(["top", "price", "departureTime", "arrivalTime", "duration", "emissions"]).optional(),
      nextPageToken: z.string().nullable().optional(),
    }))
    .output(z.object({
      output: z.object({
        bestFlights: z.array(z.record(z.unknown())).optional(),
        otherFlights: z.array(z.record(z.unknown())).optional(),
        nextPageToken: z.string().nullable().optional(),
      }).passthrough(),
    }).passthrough())
    .mutation(async ({ ctx, input }) => {
      const trip = input.returnDate
        ? { flightType: "round_trip", departureAirports: input.departureAirports, arrivalAirports: input.arrivalAirports, outboundDate: input.departureDate, returnDate: input.returnDate }
        : { flightType: "one_way", departureAirports: input.departureAirports, arrivalAirports: input.arrivalAirports, outboundDate: input.departureDate };
      return callFiber(() => flightSearch({
        body: {
          apiKey: ctx.apiKey,
          trip: trip as Record<string, unknown> as never,
          adults: input.adults,
          travelClass: input.travelClass,
          maxStops: input.maxStops,
          sortBy: input.sortBy,
          nextPageToken: input.nextPageToken ?? null,
        },
      }));
    }),

  /** Cheapest destinations from an airport, either free-text ("beach in December") or structured filters. */
  deals: protectedProcedure
    .input(z.object({
      departureAirports: z.string().trim().min(2),
      freeText: z.string().trim().optional(),
      maxPrice: z.number().positive().optional(),
      maxStops: z.number().int().min(0).max(3).optional(),
      travelClass: travelClass.optional(),
      airlines: z.array(z.string().trim().min(2)).optional(),
    }))
    .output(passthrough)
    .mutation(async ({ ctx, input }) => {
      const discovery = input.freeText
        ? { mode: "freeText" as const, freeText: input.freeText }
        : {
          mode: "filters" as const,
          maxPrice: input.maxPrice ?? null,
          maxStops: input.maxStops ?? null,
          travelClass: input.travelClass ?? null,
          airlines: input.airlines?.length ? { include: input.airlines } : null,
        };
      return callFiber(() => flightDeals({
        body: { apiKey: ctx.apiKey, departureAirports: input.departureAirports, discovery },
      }));
    }),

  /** Where to buy a specific itinerary from search results (needs its bookingToken + the original trip). */
  bookingOptions: protectedProcedure
    .input(z.object({
      bookingToken: z.string().min(1),
      departureAirports: z.string().trim().min(2),
      arrivalAirports: z.string().trim().min(2),
      departureDate: isoDate,
      returnDate: isoDate.optional(),
    }))
    .output(passthrough)
    .query(async ({ ctx, input }) => {
      const trip = input.returnDate
        ? { flightType: "round_trip" as const, departureAirports: input.departureAirports, arrivalAirports: input.arrivalAirports, outboundDate: input.departureDate, returnDate: input.returnDate }
        : { flightType: "one_way" as const, departureAirports: input.departureAirports, arrivalAirports: input.arrivalAirports, outboundDate: input.departureDate };
      return callFiber(() => flightBookingOptions({ body: { apiKey: ctx.apiKey, bookingToken: input.bookingToken, trip } }));
    }),
});
