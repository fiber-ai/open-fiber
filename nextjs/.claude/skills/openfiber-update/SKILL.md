---
name: openfiber-update
description: "Periodic OpenFiber sync with the latest @fiberai/sdk release: bump versions, fix build breaks, find new SDK functionality missing a UI, retire deprecated endpoints' UI, run e2e, file a Linear ticket. Use manually after every Fiber main release / new SDK version, or when a scheduled check detects a newer @fiberai/sdk is published."
trigger: /openfiber-update
---

# /openfiber-update

Repeatable playbook for syncing OpenFiber (`nextjs/`) with the latest `@fiberai/sdk` release. There is no SDK changelog — breaking changes are only discoverable by diffing type signatures and cross-checking the live API surface, so most of this skill is about *detecting* what changed, not just bumping a version number.

Run all commands from `nextjs/` unless noted otherwise.

## Stage 0 — Setup

1. `git status` — the working tree must be clean before starting. If it isn't, stop and tell the user rather than stashing/discarding anything for them.
2. Read the current `@fiberai/sdk` version from `package.json`.
3. Create a branch: `chore/openfiber-update-<new-version>` (exact new version filled in once known in Stage 1; use `chore/openfiber-update-wip` until then, then rename via `git branch -m` once the target version is known).
4. Copy `node_modules/@fiberai/sdk/dist/index.d.ts` to a scratch file (e.g. `/tmp/fiberai-sdk-old.d.ts`) — this is the only reliable way to diff exported functions/signatures across versions since the package ships no CHANGELOG.

## Stage 1 — Bump versions

1. `npm view @fiberai/sdk version` to see the latest published version. If it matches what's already in `package.json`, report "already up to date" and stop here (still worth running Stage 1's `npm outdated` check below in case other deps drifted).
2. `npm install @fiberai/sdk@latest`.
3. `npm outdated` — for every other dependency, apply **patch/minor** bumps only via `npm update`. Do **not** apply major bumps automatically (e.g. a Next.js or React major) — collect them into a "majors available but not applied" list for the final report instead.

## Stage 2 — Detect what the bump changed

1. Diff `/tmp/fiberai-sdk-old.d.ts` against the freshly installed `node_modules/@fiberai/sdk/dist/index.d.ts`. Look for:
   - Removed exports → likely a deprecated/removed endpoint.
   - Changed required fields on input types (e.g. a newly-required `subscriptionId`, as happened in the 0.0.35→0.0.39 bump).
   - Changed return/output types (esp. object → array shape changes — the most common break class seen historically, e.g. credits and auto-topup responses).
2. `grep -rn "fiberFetch" nextjs/src/server/routers/*.ts` — these are routers that bypass the generated SDK because a past version's generated types didn't match live behavior. For each hit, try switching it back to the real typed SDK call now that the SDK is newer; keep the `fiberFetch` bypass only if it still doesn't validate.
3. Cross-check the live endpoint surface with the `fiber-ai` MCP tools (`list_all_endpoints`, `search_endpoints`, `get_endpoint_details_full`) against what Stage 2.1's diff found — this catches endpoints that were hidden/deprecated on the backend without necessarily removing the SDK export.

## Stage 3 — Fix the build

Iterate until clean, fixing errors as they surface (expected classes: Zod schema mismatches on shape changes, new required params to thread through tRPC procedures, renamed/removed SDK exports):

1. `npm run typecheck`
2. `npm run lint`
3. `npm run build`

## Stage 4 — Find new SDK functionality without a UI yet (report only)

1. From the new `index.d.ts` / the `fiber-ai` MCP endpoint listing, enumerate exported operations.
2. `grep -rn` across `nextjs/src/server/routers/*.ts` for each operation name to see what's actually wired up.
3. For anything exported but never called anywhere in the routers, add it to a "new functionality, no UI" list: operation name, one-line description (from `get_endpoint_details_full` if useful), and the closest existing analogous page/router if one exists.
4. Do **not** scaffold new pages for these — this list goes into the final report/Linear ticket for a human to scope as a follow-up.

## Stage 5 — Remove or replace deprecated UI

For each endpoint confirmed hidden/removed in Stage 2:

1. `grep -rn` across `nextjs/src/app/**` and `nextjs/src/server/routers/**` for usage.
2. If a documented modern equivalent exists, migrate the router/page to it (mirroring the enrichment-reveal-options consolidation and Investors-page removal from the v44 migration). If there's no equivalent, delete the now-dead page/router code.

## Stage 6 — Run E2E

1. Confirm `E2E_FIBER_API_KEY` is set (and `E2E_TEST_LINKEDIN_URL` if available) — these tests hit the live API and spend real credits, they are not mocked.
2. `npm run test:e2e`.
3. Pay particular attention to `e2e/account-credits.spec.ts` (the dedicated regression gate for the object/array shape-mismatch bug class) and `e2e/navigation.spec.ts` (broad render/console-error smoke check across all routes).
4. On failure, go back to Stage 3 or 5 as appropriate and re-run until green.

## Stage 7 — Summarize, file a Linear ticket, and stop

1. Rename the branch to include the actual target version if not already done, and commit all changes with a message covering: old → new SDK version, what broke and was fixed, other deps bumped, majors available but skipped.
2. Assemble the run summary: version bump, build fixes made (Stage 3), new-functionality report (Stage 4), deprecated-UI removals (Stage 5), e2e result (Stage 6), branch name, and a suggested PR title/body.
3. Call `mcp__linear__create_issue`:
   - team: **FIB** (`fbff5609-046c-4a79-bf27-e0a7a8f67e93`)
   - project: **OpenFiber** (`385a9b3a-8080-4c57-b1aa-39574d597fd2`)
   - assignee: **Yash Vijay** (`5c39e941-380e-4213-bd6b-c2468fc96a38`)
   - title: `OpenFiber update: @fiberai/sdk v<old> → v<new>`
   - description: the run summary from step 2
   - Only file this ticket once the run actually finished (build fixed and e2e green) — not on a failed/incomplete run.
4. Print the same summary to the user.
5. **Stop.** Do not `git push` or open a PR — present the branch and suggested PR title/body, and wait for explicit confirmation before doing either.

## Notes for whoever (or whatever) invokes this

- If invoked by the scheduled periodic check (see the `openfiber-sdk-check` routine) rather than a human, follow the exact same stages — the only difference is what triggered the run, not what the run does. Still stop before push/PR at the end of Stage 7.
- If Stage 1 finds the SDK is already at the latest version and `npm outdated` shows nothing worth bumping, skip straight to reporting "nothing to do" — don't file a Linear ticket or open a branch for a no-op run.
