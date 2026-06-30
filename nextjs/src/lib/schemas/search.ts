import { z } from "zod";
import {
  anyOfNoneOfString,
  anyOfAllOfNoneOfString,
  numericRange,
  dateTimeFilter,
} from "./common";

const employeeCountBucket = z.enum([
  "0", "1", "10", "50", "200", "500", "1000", "5000", "10000",
]);

const fundingStage = z.enum([
  "acquired", "public", "closed", "pre_seed", "seed",
  "series_a", "series_b", "series_c", "series_d",
  "series_e", "series_f", "series_g", "series_h",
  "series_i", "series_j", "venture_other", "private_equity",
  "unknown", "no_funding_yet",
]);

export const FUNDING_STAGE_LABELS: Record<string, string> = {
  no_funding_yet: "No Funding Yet",
  pre_seed: "Pre-Seed",
  seed: "Seed",
  series_a: "Series A",
  series_b: "Series B",
  series_c: "Series C",
  series_d: "Series D",
  series_e: "Series E",
  series_f: "Series F",
  series_g: "Series G+",
  venture_other: "Venture (Other)",
  private_equity: "Private Equity",
  public: "Public",
  acquired: "Acquired",
  closed: "Closed",
  unknown: "Unknown",
};

export const EMPLOYEE_COUNT_LABELS: Record<string, string> = {
  "1": "1-10",
  "10": "11-50",
  "50": "51-200",
  "200": "201-500",
  "500": "501-1K",
  "1000": "1K-5K",
  "5000": "5K-10K",
  "10000": "10K+",
};

export const industry = z.enum([
  "Administrative Services", "Aerospace & Military", "Artificial Intelligence",
  "Arts & Music", "Automotive", "Business Services", "Cloud", "Construction",
  "Consulting", "Consumer Goods", "Consumer Services", "Design", "Education",
  "Energy", "Entertainment", "Environmental", "Events", "Farming & Agriculture",
  "Finance", "Food & Beverage", "Gaming", "Government", "Hardware", "Healthcare",
  "Hospitality", "Industrials", "Information Technology", "Insurance", "Legal",
  "Life Sciences", "Logistics", "Manufacturing", "Marketing & Advertising",
  "Media", "Mining", "Nonprofit", "Publishing", "Real Estate", "Retail",
  "Science & Engineering", "Security", "Software", "Sports", "Telecom",
  "Trade", "Transportation", "Travel & Tourism", "Utilities", "Venture Capital",
]);

export const companyStatus = z.enum(["active", "acquired", "closed"]);

export const companyTag = z.enum([
  "raised-from-top-vc", "is-government", "is-school", "venture-backed-startup",
]);

export const acceleratorName = z.enum([
  "a16z_speedrun", "accel_atoms", "ai2_incubator", "alchemist_accelerator",
  "alliance", "antler", "berkeley_skydeck", "founders_inc", "google_startups",
  "launch_accelerator", "neo", "pear_x", "plug_and_play", "sosv",
  "south_park_commons", "startx", "techstars", "the_mint", "ycombinator",
]);

export const ACCELERATOR_LABELS: Record<string, string> = {
  a16z_speedrun: "a16z Speedrun",
  accel_atoms: "Accel Atoms",
  ai2_incubator: "AI2 Incubator",
  alchemist_accelerator: "Alchemist Accelerator",
  alliance: "Alliance",
  antler: "Antler",
  berkeley_skydeck: "Berkeley SkyDeck",
  founders_inc: "Founders Inc",
  google_startups: "Google Startups",
  launch_accelerator: "Launch Accelerator",
  neo: "Neo",
  pear_x: "Pear X",
  plug_and_play: "Plug and Play",
  sosv: "SOSV",
  south_park_commons: "South Park Commons",
  startx: "StartX",
  techstars: "Techstars",
  the_mint: "The Mint",
  ycombinator: "Y Combinator",
};

export const companySearchParamsSchema = z.object({
  // Company Identity
  nameLike: anyOfNoneOfString,
  domains: z.array(z.string()).nullable().optional(),

  // Location
  headquartersCountryCode: anyOfNoneOfString,
  headquartersStateName: anyOfNoneOfString,

  // Size & Stage
  employeeCountV2: z
    .object({
      lowerBoundExclusive: z.number().nullable().optional(),
      upperBoundInclusive: z.number().nullable().optional(),
    })
    .nullable()
    .optional(),
  stage: z
    .object({
      anyOf: z.array(fundingStage).nullable().optional(),
      noneOf: z.array(fundingStage).nullable().optional(),
    })
    .nullable()
    .optional(),
  totalFundingUSD: numericRange,
  lastFundingUSD: numericRange,

  // Industry & Keywords
  industriesV2: z
    .object({
      anyOf: z.array(industry).nullable().optional(),
      noneOf: z.array(industry).nullable().optional(),
      allOf: z.array(industry).nullable().optional(),
    })
    .nullable()
    .optional(),
  keywords: z
    .object({
      containsAll: z.array(z.string()).nullable().optional(),
      containsAny: z.array(z.string()).nullable().optional(),
      containsNone: z.array(z.string()).nullable().optional(),
    })
    .nullable()
    .optional(),
  naicsCodes: z
    .object({
      anyOf: z.array(z.object({ code: z.string(), title: z.string() })).nullable().optional(),
      allOf: z.array(z.object({ code: z.string(), title: z.string() })).nullable().optional(),
      noneOf: z.array(z.object({ code: z.string(), title: z.string() })).nullable().optional(),
    })
    .nullable()
    .optional(),
  tags: z
    .object({
      anyOf: z.array(companyTag).nullable().optional(),
      allOf: z.array(companyTag).nullable().optional(),
      noneOf: z.array(companyTag).nullable().optional(),
    })
    .nullable()
    .optional(),

  // Growth & Trends
  employeeTrends: z
    .object({
      obeysAll: z.array(z.object({
        jobFunction: z.string(),
        countCriteria: z.object({
          type: z.enum(["numeric_change", "percent_change", "current_count"]),
          change: numericRange,
          range: numericRange,
          windowLookBackMonths: z.number().optional(),
        }),
      })).nullable().optional(),
    })
    .nullable()
    .optional(),

  // Accelerators
  acceleratorsV2: z
    .object({
      anyOf: z.array(z.object({
        acceleratorName,
        batchSelection: z.object({
          strategy: z.enum(["all-batches", "only-these-batches"]),
          batches: z.array(z.string()).optional(),
        }).nullable().optional(),
        years: numericRange,
      })).nullable().optional(),
      noneOf: z.array(z.object({
        acceleratorName,
        batchSelection: z.any().nullable().optional(),
        years: numericRange,
      })).nullable().optional(),
    })
    .nullable()
    .optional(),

  // Dates
  foundedOn: dateTimeFilter,
  lastFundedOn: dateTimeFilter,

  // Technologies
  technologies: z
    .object({
      anyOf: z.array(z.object({
        type: z.enum(["predefined", "custom"]),
        technology: z.string().optional(),
        name: z.string().optional(),
      })).nullable().optional(),
      allOf: z.array(z.object({
        type: z.enum(["predefined", "custom"]),
        technology: z.string().optional(),
        name: z.string().optional(),
      })).nullable().optional(),
      noneOf: z.array(z.object({
        type: z.enum(["predefined", "custom"]),
        technology: z.string().optional(),
        name: z.string().optional(),
      })).nullable().optional(),
    })
    .nullable()
    .optional(),

  // Status
  status: z
    .object({
      anyOf: z.array(companyStatus).nullable().optional(),
      noneOf: z.array(companyStatus).nullable().optional(),
    })
    .nullable()
    .optional(),

  // Revenue
  revenueUSD: z
    .object({
      min: z.object({ quantity: z.number(), suffix: z.enum(["K", "M", "B", "T"]).nullable() }).nullable().optional(),
      max: z.object({ quantity: z.number(), suffix: z.enum(["K", "M", "B", "T"]).nullable() }).nullable().optional(),
    })
    .nullable()
    .optional(),
});

export type CompanySearchParams = z.infer<typeof companySearchParamsSchema>;

// --- People / Prospect Search ---

export const seniorityLevel = z.enum([
  "Entry level", "Associate", "Mid-Senior level", "Director", "Executive", "Internship",
]);

export const profileTag = z.enum([
  "student", "attended-top-us-university", "attended-top-global-university",
  "second-time-founder", "deep-technical-background", "major-tech-company-experience",
  "fortune-500-executive", "recently-changed-companies", "recently-promoted",
  "decision-maker", "c-suite", "experienced-executive", "phd", "influencer", "board-member",
]);

export const PROFILE_TAG_LABELS: Record<string, string> = {
  student: "Student",
  "attended-top-us-university": "Top US University",
  "attended-top-global-university": "Top Global University",
  "second-time-founder": "Second-Time Founder",
  "deep-technical-background": "Deep Technical Background",
  "major-tech-company-experience": "Major Tech Co. Experience",
  "fortune-500-executive": "Fortune 500 Executive",
  "recently-changed-companies": "Recently Changed Companies",
  "recently-promoted": "Recently Promoted",
  "decision-maker": "Decision Maker",
  "c-suite": "C-Suite",
  "experienced-executive": "Experienced Executive",
  phd: "PhD",
  influencer: "Influencer",
  "board-member": "Board Member",
};

const jobTitleV2ItemSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("term"), term: z.string() }),
  z.object({ type: z.literal("static-groups"), groups: z.array(z.string()) }),
  z.object({ type: z.literal("dynamic-groups"), groups: z.array(z.string()), keywords: z.array(z.string()).default([]) }),
]);

export const peopleSearchParamsSchema = z.object({
  // Job Title
  jobTitleV2: z
    .object({
      anyOf: z.array(jobTitleV2ItemSchema).nullable().optional(),
      noneOf: z.array(jobTitleV2ItemSchema).nullable().optional(),
    })
    .nullable()
    .optional(),

  // Location
  country3LetterCode: anyOfNoneOfString,
  state: z
    .object({
      anyOf: z.array(z.object({
        countryCode: z.string(),
        stateName: z.string(),
      })).nullable().optional(),
      noneOf: z.array(z.object({
        countryCode: z.string(),
        stateName: z.string(),
      })).nullable().optional(),
    })
    .nullable()
    .optional(),

  // Experience
  yearsOfExperience: numericRange,

  // Keywords
  keywords: z
    .object({
      containsAll: z.array(z.string()).nullable().optional(),
      containsAny: z.array(z.string()).nullable().optional(),
      containsNone: z.array(z.string()).nullable().optional(),
    })
    .nullable()
    .optional(),

  // Tags
  tags: z
    .object({
      anyOf: z.array(profileTag).nullable().optional(),
      allOf: z.array(profileTag).nullable().optional(),
      noneOf: z.array(profileTag).nullable().optional(),
    })
    .nullable()
    .optional(),

  // Education
  education: z
    .object({
      anyOf: z.array(z.object({
        school: z.string().optional(),
        degree: z.string().optional(),
        keywords: z.array(z.string()).optional(),
      })).nullable().optional(),
    })
    .nullable()
    .optional(),

  // Languages
  languages: anyOfAllOfNoneOfString,

  // Job status
  jobStatus: z
    .object({
      status: z.enum(["currently-employed", "previously-employed", "ever-employed"]),
      companyParams: companySearchParamsSchema.optional(),
    })
    .nullable()
    .optional(),

  // Dates
  startedInRole: dateTimeFilter,
  startedAtCompany: dateTimeFilter,

  // Profile attributes
  hasProfilePicture: z.boolean().nullable().optional(),
  isInStealth: z.boolean().nullable().optional(),

  // Connections / Followers
  numConnections: numericRange,
  numFollowers: numericRange,

  // Fuzzy name match
  fuzzyName: z
    .object({
      anyOf: z.array(z.object({ name: z.string() })).nullable().optional(),
    })
    .nullable()
    .optional(),
});

export type PeopleSearchParams = z.infer<typeof peopleSearchParamsSchema>;
