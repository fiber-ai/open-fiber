# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two audiences, weighted equally:

- **Developers at Fiber AI customers** who fork OpenFiber as a reference implementation or a drop-in prospecting UI for their own internal tools or customer-facing features. They read the code as much as they use the screens.
- **Sales / GTM operators** who use the running app day to day to search companies and people, enrich contacts, build audiences, track changes and export data.

## Product Purpose

OpenFiber is the open-source reference frontend for Fiber AI's APIs. It shows how every Fiber endpoint works together end to end (search, enrichment, audiences, trackers, exports, lookup tools) and gives customers a working prospecting UI they can fork, restyle and ship instead of starting from scratch. Success: a developer can understand an endpoint by using its page and reading its code, and an operator can finish a prospecting task without friction.

## Positioning

The only UI that is built directly on the official `@fiberai/sdk` and maintained by Fiber, so it tracks the real API surface page for page. Needs nothing but a Fiber API key: no database, no auth provider, no third-party services.

## Operating Context

- Self-hosted Next.js app. The visitor's API key is set via the in-app setup page (stored in an HttpOnly cookie) or `FIBER_API_KEY`.
- Browser → tRPC → Next.js API routes → `@fiberai/sdk` → api.fiber.ai. The API key never reaches the client.
- Dense, data-heavy work: filter panels, paginated tables, async enrichment polling, CSV import/export, credit usage.

## Capabilities and Constraints

- Sections: Search (companies, prospects, combined, AI, job postings, blue-collar, stealth), Enrichment (single, batch, bulk, LinkedIn live), Audiences, Exclusion lists, Saved searches, Trackers, Exports, Market data, ~25 lookup Tools, Account/usage.
- Stack is fixed: Next.js pages router, TypeScript strict, tRPC + Zod, shadcn/ui (Radix), Tailwind, TanStack Query/Table, Lucide icons.
- Must stay easy to restyle: forks swap the theme by editing CSS tokens, not by hunting through components.

## Brand Commitments

- Carries the Fiber AI brand (confirmed by the team): Fiber's Figma palette — purple scale centred on `#9D78F0`, lavender-tinted background `#FAF8FE`, border `#E8E8E8`, text `#1E1E1E`.
- Fiber's product typeface is TWK Lausanne, a licensed commercial font that cannot ship in this open-source repo; OpenFiber uses an open-licence grotesk stand-in behind a `--font-sans` token.
- All brand values live in tokens so forks can replace them in one place.

## Evidence on Hand

- README.md (product description, architecture).
- No testimonials, customer logos or benchmarks in this repo; do not invent any.

## Product Principles

1. The code is part of the product: patterns should be clean enough to copy.
2. One page per API capability; the UI mirrors the API faithfully.
3. Task speed over decoration — this is an operating tool.
4. Theme through tokens only, so restyling a fork is a one-file change.

## Accessibility & Inclusion

Target WCAG 2.1 AA for text contrast, focus visibility and keyboard operation.
