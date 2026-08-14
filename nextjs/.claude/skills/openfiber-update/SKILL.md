---
name: openfiber-update
description: "Periodic OpenFiber sync with the latest @fiberai/sdk release: bump versions, fix build breaks, find new SDK functionality missing a UI, retire deprecated endpoints' UI, run e2e, file a Linear ticket. Invoked manually (Claude Code or `opencode run --command openfiber-update`) after every Fiber main release / new SDK version, or automatically by the local scripts/openfiber-update-check.mts cron job."
trigger: /openfiber-update
---

# /openfiber-update

Repeatable playbook for syncing OpenFiber (`nextjs/`) with the latest `@fiberai/sdk` release. There is no SDK changelog — breaking changes are only discoverable by diffing type signatures and cross-checking the live API surface, so most of this skill is about *detecting* what changed, not just bumping a version number.

Run all commands from `nextjs/` unless noted otherwise — this applies whether invoked manually or by `scripts/openfiber-update-check.mts` (which sets cwd to the worktree's `nextjs/` too). Paths in commands below are therefore relative to `nextjs/`, e.g. `src/server/routers/*.ts`, **not** `nextjs/src/server/routers/*.ts` — the latter silently matches nothing rather than erroring.

**Model routing** (per `~/.config/opencode/model-routing.md` §9-10): this whole playbook defaults to OpenCode's configured model (DeepSeek V4 Flash/Pro). Each stage below is annotated with which tier fits it. If a stage's escalation condition is hit and no bigger model is available in this run, stop and let Stage 7 file a BLOCKED ticket rather than looping indefinitely — a human decides whether to pick it up in Claude Code.

## Stage 0 — Setup
*Model: DeepSeek V4 Flash — mechanical.*

1. `git status` — the working tree must be clean before starting. If it isn't, stop and tell the user rather than stashing/discarding anything for them.
2. Read the current `@fiberai/sdk` version from `package.json`.
3. Create a branch: `chore/openfiber-update-<new-version>` (exact new version filled in once known in Stage 1; use `chore/openfiber-update-wip` until then, then rename via `git branch -m` once the target version is known). **Skip this step if the current branch is already named `chore/openfiber-update-*`** — the automated harness (`scripts/openfiber-update-check.mts`) creates and checks out this branch itself before invoking this skill, already knowing the target version; only create one manually when invoked interactively without it.
4. Copy `node_modules/@fiberai/sdk/dist/index.d.ts` to a scratch file (e.g. `/tmp/fiberai-sdk-old.d.ts`) — this is the only reliable way to diff exported functions/signatures across versions since the package ships no CHANGELOG. (The automated harness runs `npm ci` before invoking this skill specifically so this file exists; if running manually, install dependencies first.)

## Stage 1 — Bump versions
*Model: DeepSeek V4 Flash — mechanical, mirrors an existing `npm install`/`npm update` pattern.*

1. `npm view @fiberai/sdk version` to see the latest published version. If it matches what's already in `package.json`, report "already up to date" and stop here (still worth running Stage 1's `npm outdated` check below in case other deps drifted).
2. `npm install @fiberai/sdk@latest`.
3. `npm outdated` — for every other dependency, apply **patch/minor** bumps only via `npm update`. Do **not** apply major bumps automatically (e.g. a Next.js or React major) — collect them into a "majors available but not applied" list for the final report instead.

## Stage 2 — Detect what the bump changed
*Model: DeepSeek V4 Pro — real diagnosis work, not boilerplate. Escalate if: the type diff is ambiguous about whether something is a genuine breaking change after 2 attempts to classify it → stop and let Stage 7 file a BLOCKED ticket for manual (Claude Code) triage.*

1. Diff `/tmp/fiberai-sdk-old.d.ts` against the freshly installed `node_modules/@fiberai/sdk/dist/index.d.ts`. Look for:
   - Removed exports → likely a deprecated/removed endpoint.
   - Changed required fields on input types (e.g. a newly-required `subscriptionId`, as happened in the 0.0.35→0.0.39 bump).
   - Changed return/output types (esp. object → array shape changes — the most common break class seen historically, e.g. credits and auto-topup responses).
2. `grep -rn "fiberFetch" src/server/routers/*.ts` (relative to `nextjs/`, per the note above — not `nextjs/src/...`, which silently matches nothing when cwd is already `nextjs/`) — these are routers that bypass the generated SDK because a past version's generated types didn't match live behavior. For each hit, try switching it back to the real typed SDK call now that the SDK is newer; keep the `fiberFetch` bypass only if it still doesn't validate.
3. Cross-check the live endpoint surface with the `fiber-ai` MCP tools (`list_all_endpoints`, `search_endpoints`, `get_endpoint_details_full`) against what Stage 2.1's diff found — this catches endpoints that were hidden/deprecated on the backend without necessarily removing the SDK export.

## Stage 3 — Fix the build
*Model: DeepSeek V4 Pro — localized bug fix with a clear repro (the failing typecheck/lint/build output). Escalate if: the same error survives 2 fix attempts, or the fix requires an architectural/API-contract judgment call → stop, don't loop a 3rd time; Stage 7 files a BLOCKED ticket instead.*

Iterate until clean, fixing errors as they surface (expected classes: Zod schema mismatches on shape changes, new required params to thread through tRPC procedures, renamed/removed SDK exports):

1. `npm run typecheck`
2. `npm run lint`
3. `npm run build`

## Stage 4 — Find new SDK functionality without a UI yet (report only)
*Model: DeepSeek V4 Flash — mechanical enumeration/diffing, not judgment (the judgment call about what to build is explicitly deferred to a human, see below).*

1. From the new `index.d.ts` / the `fiber-ai` MCP endpoint listing, enumerate exported operations.
2. `grep -rn` across `src/server/routers/*.ts` (relative to `nextjs/` — see the cwd note in the intro) for each operation name to see what's actually wired up.
3. For anything exported but never called anywhere in the routers, add it to a "new functionality, no UI" list: operation name, one-line description (from `get_endpoint_details_full` if useful), and the closest existing analogous page/router if one exists.
4. Do **not** scaffold new pages for these — this list goes into the final report/Linear ticket for a human to scope as a follow-up.

## Stage 5 — Remove or replace deprecated UI
*Model: DeepSeek V4 Pro / Qwen3.7 Max — multi-file refactor. Escalate if: no documented modern equivalent exists and the removal touches a customer-facing contract → stop, let Stage 7 file a BLOCKED ticket rather than guessing at product intent.*

For each endpoint confirmed hidden/removed in Stage 2:

1. `grep -rn` across `src/pages/**` and `src/server/routers/**` (relative to `nextjs/` — see the cwd note in the intro). This repo uses the Next.js **Pages Router** — there is no `src/app/`; page routes live under `src/pages/**`.
2. If a documented modern equivalent exists, migrate the router/page to it (mirroring the enrichment-reveal-options consolidation and Investors-page removal from the v44 migration). If there's no equivalent, delete the now-dead page/router code.

## Stage 6 — Run E2E
*Model: DeepSeek V4 Flash/Pro — running and triaging test output is mostly mechanical; treat repeated failures on the same spec as a Stage-3-style escalation trigger.*

1. Confirm `E2E_FIBER_API_KEY` is set (and `E2E_TEST_LINKEDIN_URL` if available) — these tests hit the live API and spend real credits, they are not mocked.
2. `npm run test:e2e`.
3. Pay particular attention to `e2e/account-credits.spec.ts` (the dedicated regression gate for the object/array shape-mismatch bug class) and `e2e/navigation.spec.ts` (broad render/console-error smoke check across all routes).
4. On failure, go back to Stage 3 or 5 as appropriate and re-run until green. If the same spec still fails after 2 fix attempts, stop — don't loop a 3rd time — and let Stage 7 file a BLOCKED ticket.

## Stage 7 — Summarize, file a Linear ticket, and stop
*Model: DeepSeek V4 Flash — mechanical writing.*

1. Rename the branch to include the actual target version if not already done, and commit whatever changes exist so far (even on a blocked/incomplete run — partial progress is still worth keeping) with a message covering: old → new SDK version, what broke and was fixed, other deps bumped, majors available but skipped.
2. Assemble the run summary: version bump, build fixes made (Stage 3), new-functionality report (Stage 4), deprecated-UI removals (Stage 5), e2e result (Stage 6), branch name, and a suggested PR title/body.
3. Call `mcp__linear__create_issue`:
   - team: **FIB** (`fbff5609-046c-4a79-bf27-e0a7a8f67e93`)
   - project: **OpenFiber** (`385a9b3a-8080-4c57-b1aa-39574d597fd2`)
   - assignee: **Yash Vijay** (`5c39e941-380e-4213-bd6b-c2468fc96a38`)
   - **If the run finished cleanly** (build fixed and e2e green): title `OpenFiber update: @fiberai/sdk v<old> → v<new>`, description = the run summary from step 2.
   - **If the run hit an escalation trigger and stopped early** (Stage 2/3/5/6's "escalate if" conditions): title `OpenFiber update BLOCKED: @fiberai/sdk v<old> → v<new>`, description = what was tried, exactly where/why it got stuck, and an explicit note that this needs manual attention (likely in Claude Code, since DeepSeek/OpenCode couldn't close it out automatically) rather than another automated retry.
   - Either way, only skip filing a ticket entirely if Stage 1 found nothing to do (see the closing notes below) — a real attempt, finished or blocked, always gets a ticket so nothing silently disappears.
4. Print the same summary to the user.
5. **Stop.** Do not `git push` or open a PR — present the branch and suggested PR title/body, and wait for explicit confirmation before doing either.

## Notes for whoever (or whatever) invokes this

- This skill is invoked identically by a human (`/openfiber-update` in Claude Code or OpenCode) or by the local scheduled check (`nextjs/scripts/openfiber-update-check.mts`, cron-driven, which runs it headlessly via `opencode run --command openfiber-update --auto`, mirroring how the backend's `greenify.ts` runs `/fixup`). Same stages either way — the only difference is what triggered the run, not what the run does. Still stop before push/PR at the end of Stage 7.
- If Stage 1 finds the SDK is already at the latest version and `npm outdated` shows nothing worth bumping, skip straight to reporting "nothing to do" — don't file a Linear ticket or open a branch for a no-op run.
