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
import { redditRouter } from "./reddit";
import { instagramRouter } from "./instagram";
import { tiktokRouter } from "./tiktok";
import { depthChartRouter } from "./depth-chart";
import { stealthRouter } from "./stealth";
import { blueCollarRouter } from "./blue-collar";
import { mediaRouter } from "./media";
import { flightsRouter } from "./flights";
import { realEstateRouter } from "./real-estate";
import { trackerRouter } from "./tracker";
import { financeRouter } from "./finance";
import { apiKeysRouter } from "./api-keys";

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
  reddit: redditRouter,
  instagram: instagramRouter,
  tiktok: tiktokRouter,
  depthChart: depthChartRouter,
  stealth: stealthRouter,
  blueCollar: blueCollarRouter,
  media: mediaRouter,
  flights: flightsRouter,
  realEstate: realEstateRouter,
  tracker: trackerRouter,
  finance: financeRouter,
  apiKeys: apiKeysRouter,
});

export type AppRouter = typeof appRouter;
