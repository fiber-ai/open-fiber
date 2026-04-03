import { z } from "zod";

export const paginationSchema = z.object({
  cursor: z.string().nullable().optional(),
  pageSize: z.number().min(1).max(100).default(25),
});

export const anyOfNoneOfString = z
  .object({
    anyOf: z.array(z.string()).nullable().optional(),
    noneOf: z.array(z.string()).nullable().optional(),
  })
  .optional()
  .nullable();

export const anyOfAllOfNoneOfString = z
  .object({
    anyOf: z.array(z.string()).nullable().optional(),
    allOf: z.array(z.string()).nullable().optional(),
    noneOf: z.array(z.string()).nullable().optional(),
  })
  .optional()
  .nullable();

export const numericRange = z
  .object({
    lowerBound: z.number().nullable().optional(),
    upperBound: z.number().nullable().optional(),
  })
  .optional()
  .nullable();

export const dateTimeFilter = z
  .object({
    strategy: z.enum(["absolute", "relative"]),
    range: z
      .object({
        lowerBound: z.string().nullable().optional(),
        upperBound: z.string().nullable().optional(),
      })
      .nullable()
      .optional(),
    window: z
      .object({
        method: z.enum(["lastN", "within", "calendar"]),
        period: z.enum(["day", "week", "month", "quarter", "year"]),
        quantity: z.number().optional(),
        lowerBound: z.number().nullable().optional(),
        upperBound: z.number().nullable().optional(),
        which: z.enum(["current", "previous"]).optional(),
      })
      .nullable()
      .optional(),
  })
  .optional()
  .nullable();
