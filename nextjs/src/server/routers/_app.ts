import { createTRPCRouter } from "../trpc";
import { utilityRouter } from "./utility";
import { searchRouter } from "./search";
import { enrichmentRouter } from "./enrichment";
import { linkedinRouter } from "./linkedin";
import { audienceRouter } from "./audiences";
import { savedSearchRouter } from "./saved-searches";
import { toolsRouter } from "./tools";
import { validationRouter } from "./validation";
import { exclusionListRouter } from "./exclusion-lists";
import { exportsRouter } from "./exports";

export const appRouter = createTRPCRouter({
  utility: utilityRouter,
  search: searchRouter,
  enrichment: enrichmentRouter,
  linkedin: linkedinRouter,
  audiences: audienceRouter,
  savedSearches: savedSearchRouter,
  tools: toolsRouter,
  validation: validationRouter,
  exclusionLists: exclusionListRouter,
  exports: exportsRouter,
});

export type AppRouter = typeof appRouter;
