import { z } from "zod";
import {
  listWebhookEventTypes, listWebhookEndpoints, createWebhookEndpoint,
  updateWebhookEndpoint, deleteWebhookEndpoint, rotateWebhookEndpointSecret,
  sendTestWebhookEvent,
  type CreateWebhookEndpointData,
} from "@fiberai/sdk";
import { createTRPCRouter, protectedProcedure, callFiber } from "../trpc";

type WebhookEventType = CreateWebhookEndpointData["body"]["eventTypes"][number];

/**
 * Sales Nav scraping is an internal-only API (see FIB-20647), so its completion
 * events are hidden from the catalog and can't be subscribed to from here.
 */
export const HIDDEN_EVENT_PREFIXES = ["sales_nav_"];
const isHiddenEvent = (t: string) => HIDDEN_EVENT_PREFIXES.some((p) => t.startsWith(p));

const eventTypesInput = z.array(z.string().min(1)).min(1)
  .refine((ts) => !ts.some(isHiddenEvent), "Unsupported event type");

const endpointSchema = z.object({
  endpointId: z.string(),
  url: z.string(),
  eventTypes: z.array(z.string()),
  description: z.string().nullable().optional(),
  disabled: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
}).passthrough();

export const webhooksRouter = createTRPCRouter({
  eventTypes: protectedProcedure
    .output(z.object({
      output: z.object({
        eventTypes: z.array(z.object({
          eventType: z.string(),
          description: z.string(),
          group: z.string(),
          examplePayload: z.record(z.unknown()),
        }).passthrough()),
      }).passthrough(),
    }).passthrough())
    .query(async ({ ctx }) => {
      const res = await callFiber(() => listWebhookEventTypes({ query: { apiKey: ctx.apiKey } }));
      return {
        ...res,
        output: { ...res.output, eventTypes: res.output.eventTypes.filter((e) => !isHiddenEvent(e.eventType)) },
      };
    }),

  list: protectedProcedure
    .output(z.object({ output: z.object({ endpoints: z.array(endpointSchema) }).passthrough() }).passthrough())
    .query(async ({ ctx }) => {
      return callFiber(() => listWebhookEndpoints({ query: { apiKey: ctx.apiKey } }));
    }),

  create: protectedProcedure
    .input(z.object({
      url: z.string().url(),
      eventTypes: eventTypesInput,
      description: z.string().trim().max(500).optional(),
    }))
    .output(z.object({ output: endpointSchema.extend({ signingSecret: z.string() }) }).passthrough())
    .mutation(async ({ ctx, input }) => {
      return callFiber(() => createWebhookEndpoint({
        body: {
          apiKey: ctx.apiKey,
          url: input.url,
          eventTypes: input.eventTypes as WebhookEventType[],
          description: input.description || null,
        },
      }));
    }),

  update: protectedProcedure
    .input(z.object({
      endpointId: z.string().min(1),
      url: z.string().url().optional(),
      eventTypes: eventTypesInput.optional(),
      description: z.string().trim().max(500).nullable().optional(),
      disabled: z.boolean().optional(),
    }))
    .output(z.object({ output: z.record(z.unknown()) }).passthrough())
    .mutation(async ({ ctx, input }) => {
      return callFiber(() => updateWebhookEndpoint({
        path: { endpointId: input.endpointId },
        body: {
          apiKey: ctx.apiKey,
          url: input.url,
          eventTypes: input.eventTypes as WebhookEventType[] | undefined,
          description: input.description,
          disabled: input.disabled,
        },
      }));
    }),

  delete: protectedProcedure
    .input(z.object({ endpointId: z.string().min(1) }))
    .output(z.object({ output: z.record(z.unknown()) }).passthrough())
    .mutation(async ({ ctx, input }) => {
      return callFiber(() => deleteWebhookEndpoint({
        path: { endpointId: input.endpointId },
        query: { apiKey: ctx.apiKey },
      }));
    }),

  rotateSecret: protectedProcedure
    .input(z.object({ endpointId: z.string().min(1) }))
    .output(z.object({ output: z.object({ endpointId: z.string(), signingSecret: z.string() }).passthrough() }).passthrough())
    .mutation(async ({ ctx, input }) => {
      return callFiber(() => rotateWebhookEndpointSecret({
        path: { endpointId: input.endpointId },
        body: { apiKey: ctx.apiKey },
      }));
    }),

  sendTest: protectedProcedure
    .input(z.object({ endpointId: z.string().min(1), eventType: z.string().min(1) }))
    .output(z.object({ output: z.object({ messageId: z.string() }).passthrough() }).passthrough())
    .mutation(async ({ ctx, input }) => {
      return callFiber(() => sendTestWebhookEvent({
        path: { endpointId: input.endpointId },
        body: { apiKey: ctx.apiKey, eventType: input.eventType as WebhookEventType },
      }));
    }),
});
