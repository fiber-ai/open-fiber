import type { CreateNextContextOptions } from "@trpc/server/adapters/next";
import { getApiKeyFromRequest } from "@/lib/api-key";

export async function createContext(opts: CreateNextContextOptions) {
  const apiKey = getApiKeyFromRequest(opts.req);
  return { apiKey, req: opts.req, res: opts.res };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
