# OpenFiber

An open-source reference frontend for [Fiber AI](https://fiber.ai) — build your own prospecting UI on top of Fiber's APIs.

OpenFiber lets you drop a fully-featured sales prospecting interface into your own application. It demonstrates how Fiber's APIs work together end-to-end: searching companies, finding prospects, enriching contacts, managing audiences, and exporting data — all through a clean, modern stack you can extend or embed.

## Why OpenFiber?

- **Drop-in UI for your app** — Fork it, restyle it, ship it. If you're a Fiber customer building internal tools or customer-facing prospecting features, start here instead of from scratch.
- **API reference by example** — See how every Fiber API endpoint is used in practice: search filters, pagination, async enrichment polling, CSV exports, and more.
- **Clean architecture** — Strongly-typed from database to UI. No shortcuts, no tech debt. A disciplined codebase you can learn from.

## What you need

A Fiber AI API key. That's it. Get one at [fiber.ai/app/api](https://fiber.ai/app/api).

No database, no third-party services, no OAuth providers. Just your API key in an environment variable.

## Tech Stack

| Layer             | Choice                                                       | Why                                                                    |
| ----------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------- |
| **Framework**     | Next.js + React + TypeScript (strict)                        | Industry standard, SSR-capable, great DX                               |
| **API layer**     | tRPC + Zod                                                   | Strongly-typed API routes with runtime validation — no raw fetch calls |
| **Fiber SDK**     | [`@fiberai/sdk`](https://github.com/fiber-ai/typescript-sdk) | Official TypeScript SDK wrapping all Fiber API endpoints               |
| **UI**            | shadcn/ui (Radix primitives) + Lucide icons                  | Accessible, composable, easy to restyle                                |
| **Data fetching** | TanStack Query (via tRPC)                                    | Caching, deduplication, background refetch                             |
| **Tables**        | TanStack Table                                               | Sorting, pagination, row selection for all data views                  |
| **Styling**       | Tailwind CSS                                                 | Utility-first, minimal CSS footprint                                   |
| **Validation**    | Zod (everywhere)                                             | Shared schemas between client and server                               |

### Intentionally lightweight

- **No database** — Everything goes through Fiber APIs. No local data storage needed.
- **No auth provider** — Your API key is your auth. No OAuth, no sessions, no user accounts.
- **No third-party services** — CSV import, data validation, and all other functionality is built in-house. Zero external service dependencies.

## Architecture

```
Browser → tRPC Client → Next.js API Routes → @fiberai/sdk → api.fiber.ai
```

- **Frontend** calls its own tRPC API (never calls Fiber directly)
- **tRPC procedures** call `@fiberai/sdk` server-side, keeping the API key off the client
- **Zod schemas** validate inputs and outputs at every boundary
- **TanStack Query** handles caching, loading states, and background refetching

### Repository structure

Each framework implementation lives in its own directory. The Next.js implementation is the primary reference:

```
open-fiber/
  nextjs/           # Next.js implementation (start here)
  sveltekit/        # SvelteKit implementation (coming soon)
  ...               # More frameworks welcome
```

Within the Next.js app:

```
nextjs/
  src/
    pages/            # Next.js pages (routes)
    components/       # React components
    components/ui/    # shadcn/ui primitives
    server/           # tRPC router definitions (call @fiberai/sdk here)
    lib/              # Fiber SDK client, Zod schemas, shared utilities
    hooks/            # Custom React hooks
```

## Getting Started

```bash
# Clone
git clone https://github.com/fiber-ai/open-fiber.git
cd open-fiber/nextjs

# Install
npm install

# Configure
cp .env.example .env
# Edit .env and set your Fiber API key:
#   FIBER_API_KEY=your_key_here

# Run
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). If your API key is valid, you'll see your org name and credit balance in the sidebar.

## Features

### Search

- **Company Search** — 40+ filters: industry, location, size, revenue, funding, headcount trends, tech stack, job postings, and more
- **Prospect Search** — Find people by title, location, experience, education, language, employment status, and more
- **Company → Prospect Flow** — The core workflow: find companies first, then find the right people at those companies
- **CSV Import** — Upload a CSV of companies or prospects to enrich and search against
- **AI Search** — Describe what you're looking for in plain English, get auto-generated filters
- **Search Counts** — See how many results match before committing to a full search

### Audiences

- **Create & manage audiences** — Save search results as named lists
- **View members** — Browse prospects and companies in any audience with pagination
- **Merge & duplicate** — Combine audiences or clone them

### Contact Enrichment

- **Single Lookup** — Enter a LinkedIn URL or name+company, get emails and phone numbers
- **Email-to-Person** — Reverse lookup: email address → full person profile
- **LinkedIn Live Fetch** — Real-time LinkedIn profile and company data

### Data Quality

- **Email Validation** — Check deliverability, detect bounces, flag disposable/generic addresses
- **Exclusion Lists** — Maintain company and prospect exclusion lists to prevent duplicate outreach

### Prospecting Tools

- **Google Maps Scraping** — Extract local business listings with contact info
- **Job Change Tracking** — Monitor people for job changes and get notified
- **LinkedIn URL Repair** — Transform Sales Navigator URLs to standard LinkedIn format
- **Domain Lookup** — AI-powered company discovery from a domain or description

### Data Export

- **Multi-format CSV export** — Standard, LinkedIn Ads, Google Ads, Meta Ads formats
- **Export history** — Track and download past exports

### Account

- **Usage dashboard** — Monitor credit balance and operation-level usage
- **Address Book** — Unified view of all contacts across audiences and lookups

## Configuration

The only required configuration is your Fiber API key:

```env
# .env
FIBER_API_KEY=your_fiber_api_key_here
```

The app validates the key on startup. If it's missing or invalid, you'll see setup instructions instead of the app.

## Contributing

<!-- TODO: Add contribution guidelines -->

Contributions welcome. Please open an issue first to discuss what you'd like to change.

## License

MIT — see [LICENSE](LICENSE) for details.
