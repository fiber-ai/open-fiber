import { z } from "zod";
import {
  getAllApiKeys, getCurrentApiKey,
  resetApiKeyUsage, revokeCurrentApiKey,
  updateApiKeyExpiration, updateApiKeyLimit,
} from "@fiberai/sdk";
import { createTRPCRouter, protectedProcedure, callFiber } from "../trpc";

const apiKeyInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  prefix: z.string(),
  expiresAt: z.string().nullable(),
  maxCredits: z.number().nullable(),
  creditsUsed: z.number(),
  createdAt: z.string(),
  isRevoked: z.boolean(),
}).passthrough();

/**
 * API key self-management. All operations act on the key the user pasted into
 * OpenFiber (target SELF) — managing other keys is left to the Fiber dashboard.
 */
export const apiKeysRouter = createTRPCRouter({
  getAll: protectedProcedure
    .input(z.object({ includeRevoked: z.boolean().default(false) }).optional())
    .output(z.object({
      output: z.object({ apiKeys: z.array(apiKeyInfoSchema) }).passthrough(),
    }).passthrough())
    .query(async ({ ctx, input }) => {
      return callFiber(() => getAllApiKeys({
        body: { apiKey: ctx.apiKey, includeRevoked: input?.includeRevoked ?? false },
      }));
    }),

  getCurrent: protectedProcedure
    .output(z.object({ output: apiKeyInfoSchema }).passthrough())
    .query(async ({ ctx }) => {
      return callFiber(() => getCurrentApiKey({ body: { apiKey: ctx.apiKey } }));
    }),

  resetUsage: protectedProcedure
    .output(z.object({ output: z.record(z.unknown()) }).passthrough())
    .mutation(async ({ ctx }) => {
      return callFiber(() => resetApiKeyUsage({ body: { apiKey: ctx.apiKey } }));
    }),

  /** Revokes the key this session is authenticated with — every subsequent call will fail. */
  revokeCurrent: protectedProcedure
    .output(z.object({ output: z.record(z.unknown()) }).passthrough())
    .mutation(async ({ ctx }) => {
      return callFiber(() => revokeCurrentApiKey({ body: { apiKey: ctx.apiKey } }));
    }),

  updateExpiration: protectedProcedure
    .input(z.object({
      operation: z.enum(["set", "extend", "prepone", "remove"]),
      expiresAt: z.string().nullable().optional(),
      days: z.number().int().min(1).nullable().optional(),
    }))
    .output(z.object({ output: z.record(z.unknown()) }).passthrough())
    .mutation(async ({ ctx, input }) => {
      return callFiber(() => updateApiKeyExpiration({
        body: {
          apiKey: ctx.apiKey,
          operation: input.operation,
          expiresAt: input.expiresAt ?? null,
          days: input.days ?? null,
        },
      }));
    }),

  updateLimit: protectedProcedure
    .input(z.object({
      operation: z.enum(["set", "increase", "decrease", "multiply", "divide", "remove"]),
      credits: z.number().min(0).nullable().optional(),
      factor: z.number().positive().nullable().optional(),
    }))
    .output(z.object({ output: z.record(z.unknown()) }).passthrough())
    .mutation(async ({ ctx, input }) => {
      return callFiber(() => updateApiKeyLimit({
        body: {
          apiKey: ctx.apiKey,
          operation: input.operation,
          credits: input.credits ?? null,
          factor: input.factor ?? null,
        },
      }));
    }),
});
