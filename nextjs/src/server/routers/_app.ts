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
import { journeymanRouter } from "./journeyman";
import { twitterRouter } from "./twitter";
import { youtubeRouter } from "./youtube";
import { salesNavRouter } from "./sales-nav";

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
  journeyman: journeymanRouter,
  twitter: twitterRouter,
  youtube: youtubeRouter,
  salesNav: salesNavRouter,
});

export type AppRouter = typeof appRouter;
