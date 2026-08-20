/**
 * Single source of truth for route coverage. Kept as data (not re-derived from
 * sidebar.tsx at test time) so the route list is easy to scan/diff in review and
 * doesn't silently change if sidebar.tsx's navGroups shape changes.
 *
 * Cross-checked against src/pages/**\/*.tsx during planning (50 page files total:
 * 46 static + 4 dynamic). `/` and `/setup` are intentionally excluded from
 * STATIC_ROUTES below — they're covered by dedicated specs (account-credits.spec.ts's
 * root-gate assertion, and auth.spec.ts's login flow) since they don't behave like
 * ordinary content pages.
 */

export interface StaticRoute {
  path: string;
  label: string;
}

export const STATIC_ROUTES: StaticRoute[] = [
  // Search
  { path: "/search/companies", label: "Company Search" },
  { path: "/search/prospects", label: "Prospect Search" },
  { path: "/search/combined", label: "Combined Search" },
  { path: "/search/ai", label: "AI Search" },
  { path: "/search/job-postings", label: "Job Posting Search" },
  { path: "/search/stealth", label: "Stealth Founders" },
  { path: "/search/blue-collar", label: "Blue-Collar Jobs" },

  // Enrichment
  { path: "/enrichment/single", label: "Single Lookup" },
  { path: "/enrichment/batch", label: "Batch Enrichment" },
  { path: "/enrichment/linkedin-live", label: "LinkedIn Live" },
  { path: "/enrichment/bulk", label: "Bulk Enrich" },

  // Audiences
  { path: "/audiences", label: "All Audiences" },
  { path: "/saved-searches", label: "Saved Searches" },

  // Market Intelligence
  { path: "/market/flights", label: "Flights" },
  { path: "/market/real-estate", label: "Real Estate" },
  { path: "/market/finance", label: "Finance" },

  // Trackers
  { path: "/trackers/companies", label: "Company Trackers" },
  { path: "/trackers/people", label: "People Trackers" },

  // Tools
  { path: "/tools/google-maps", label: "Google Maps" },
  { path: "/tools/depth-chart", label: "Depth Chart" },
  { path: "/tools/department-size", label: "Department Size" },
  { path: "/tools/talent-flow", label: "Talent Flow" },
  { path: "/tools/quick-resolve", label: "Quick Resolve" },
  { path: "/tools/logos", label: "Company Logos" },
  { path: "/tools/screenshot", label: "Webpage Screenshot" },
  { path: "/tools/domain-lookup", label: "Domain Lookup" },
  { path: "/tools/email-validation", label: "Email Validation" },
  { path: "/tools/phone-validation", label: "Phone Validation" },
  { path: "/tools/github-lookups", label: "GitHub Lookups" },
  { path: "/tools/linkedin-posts", label: "LinkedIn Posts" },
  { path: "/tools/job-changes", label: "Job Changes" },
  { path: "/tools/scouting-report", label: "Scouting Report" },
  { path: "/tools/social-media", label: "Social Media" },
  { path: "/tools/company-import", label: "Company Import" },
  { path: "/tools/url-repair", label: "URL Repair" },
  // Not in sidebar nav (found during route inventory) but a real, reachable page —
  // included in coverage regardless of nav visibility. See plan section 6.
  { path: "/tools/sales-navigator", label: "Sales Navigator" },

  // Social
  { path: "/tools/twitter", label: "Twitter / X" },
  { path: "/tools/youtube", label: "YouTube" },
  { path: "/tools/reddit", label: "Reddit" },
  { path: "/tools/tiktok", label: "TikTok" },
  { path: "/tools/instagram", label: "Instagram" },

  // Data
  { path: "/exclusion-lists", label: "Exclusion Lists" },
  { path: "/exports", label: "Exports" },

  // Account
  { path: "/account", label: "Usage & Credits" },
];

export interface DynamicRouteDescriptor {
  /** Human-readable name, used in test titles and skip messages. */
  name: string;
  /** The list/index page to navigate to first. */
  indexPath: string;
  /**
   * Selector for one clickable list-item on the index page. Two of the four list UIs
   * (saved-searches, trackers) navigate via a Card's onClick/router.push rather than a
   * real <a href>, so a shared `data-testid="list-item-row"` was added to those two;
   * the other two (audiences, exclusion-lists) already render real <Link> anchors.
   */
  itemSelector: string;
  /** Path prefix the browser should land on after clicking an item, for the navigation assertion. */
  detailPathPrefix: string;
  /** Whether the detail page has a working ErrorDisplay-based error state we can assert against. */
  hasErrorUi: boolean;
}

export const DYNAMIC_ROUTES: DynamicRouteDescriptor[] = [
  {
    name: "Audience detail",
    indexPath: "/audiences",
    itemSelector: 'a[href^="/audiences/"]',
    detailPathPrefix: "/audiences/",
    hasErrorUi: true,
  },
  {
    name: "Exclusion list detail (company)",
    indexPath: "/exclusion-lists",
    itemSelector: 'a[href^="/exclusion-lists/"]',
    detailPathPrefix: "/exclusion-lists/",
    hasErrorUi: true,
  },
  {
    name: "Saved search detail",
    indexPath: "/saved-searches",
    itemSelector: '[data-testid="list-item-row"]',
    detailPathPrefix: "/saved-searches/",
    hasErrorUi: true,
  },
  {
    name: "Tracker company list detail",
    indexPath: "/trackers/companies",
    itemSelector: '[data-testid="list-item-row"]',
    detailPathPrefix: "/trackers/company/",
    // Known gap: a bad listId fails silently on this page (no ErrorDisplay wired to
    // the primary list query) — flagged as a follow-up, not asserted against here.
    hasErrorUi: false,
  },
];
