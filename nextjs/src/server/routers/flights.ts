import { z } from "zod";
import { flightSearch } from "@fiberai/sdk";
import { createTRPCRouter, protectedProcedure, callFiber } from "../trpc";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");

export const flightsRouter = createTRPCRouter({
  search: protectedProcedure
    .input(z.object({
      departureAirports: z.string().trim().min(2),
      arrivalAirports: z.string().trim().min(2),
      departureDate: isoDate,
      returnDate: isoDate.optional(),
      adults: z.number().int().min(1).max(9).default(1),
      travelClass: z.enum(["economy", "premiumEconomy", "business", "first"]).optional(),
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
});
