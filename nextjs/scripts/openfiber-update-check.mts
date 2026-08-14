/**
 * openfiber-update-check — passively keep OpenFiber's @fiberai/sdk current.
 *
 * Purpose
 * -------
 * Checks the latest published `@fiberai/sdk` version against what's pinned in
 * `nextjs/package.json`. If nothing changed, this is a no-op. If a newer
 * version is published, it creates a fresh git worktree, checks out a new
 * branch, and headlessly runs `opencode run --command openfiber-update
 * --auto` there — the same pattern the backend's `scripts/chores/greenify.ts`
 * uses to run `/fixup` on red PRs, just single-purpose (one repo, one thing
 * to check) instead of iterating over many PRs. See
 * `.claude/skills/openfiber-update/SKILL.md` for what the command actually
 * does; this script only handles detection + invocation + cleanup.
 *
 * Unlike greenify, this does not use `treehouse` (that's the backend
 * monorepo's worktree-pool manager; its behavior on an unrelated repo is
 * unverified) — plain `git worktree add`/`git worktree remove` is used
 * instead, which needs no extra tooling.
 *
 * Usage
 * -----
 *   npx tsx scripts/openfiber-update-check.mts              # check + act
 *   npx tsx scripts/openfiber-update-check.mts --dry-run     # check only
 *   npx tsx scripts/openfiber-update-check.mts --force       # ignore last-attempted-version state
 *   npx tsx scripts/openfiber-update-check.mts --help
 *
 * Requirements
 * ------------
 *   `gh` (authenticated, used only by the opencode command itself for the
 *   Linear/GitHub context it needs), `git`, and `opencode` on PATH. opencode
 *   must be able to run non-interactively (its model auth must be available
 *   without a TTY) — see `~/.config/opencode/opencode.json`.
 *
 * State & logs
 * ------------
 *   Everything is written under nextjs/tmp/openfiber-update/ (gitignored):
 *     state.json                 last-attempted version + outcome
 *     openfiber-update-check.log timestamped run summary
 *     opencode-<version>.log     full headless opencode output for the last attempt
 *     .lock                      PID-file lock
 *   Delete state.json to force a retry of a version that previously failed.
 *
 * Cron (optional)
 * ---------------
 *   Daily is plenty — new SDK releases aren't hourly events:
 *     0 9 * * * cd /path/to/open-fiber && /path/to/npx tsx nextjs/scripts/openfiber-update-check.mts >> nextjs/tmp/openfiber-update/cron.log 2>&1
 *   Set PATH explicitly in the crontab if `npx`/`gh`/`opencode` aren't found
 *   under cron's minimal environment.
 */

import { execa, execaSync } from "execa";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  unlinkSync,
  writeFileSync,
  appendFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

// ─── Tunables ────────────────────────────────────────────────────────────────

const OPENCODE_TIMEOUT_MS: number = 90 * 60 * 1000; // full install+build+e2e is slower than a CI fixup
const REQUIRED_BINS: readonly string[] = ["gh", "git", "opencode"];
const OPENCODE_COMMAND: string = "openfiber-update";
const SDK_PACKAGE: string = "@fiberai/sdk";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ParsedArgs {
  dryRun: boolean;
  force: boolean;
}

interface ExecResult {
  code: number;
  stdout: string;
  stderr: string;
}

interface UpdateState {
  lastAttemptedVersion: string | null;
  lastOutcome: "success" | "failure" | null;
  lastAttemptAt: string | null;
}

// ─── Path setup ──────────────────────────────────────────────────────────────

const SCRIPT_DIR: string = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT: string = join(SCRIPT_DIR, ".."); // nextjs/
const STATE_DIR: string = join(PROJECT_ROOT, "tmp", "openfiber-update");
const LOG_PATH: string = join(STATE_DIR, "openfiber-update-check.log");
const LOCK_PATH: string = join(STATE_DIR, ".lock");
const STATE_PATH: string = join(STATE_DIR, "state.json");
mkdirSync(STATE_DIR, { recursive: true });

function augmentPath(): void {
  const extra: string[] = [
    dirname(process.execPath),
    join(homedir(), ".local", "bin"),
    join(homedir(), ".opencode", "bin"),
    "/opt/homebrew/bin",
    "/usr/local/bin",
  ];
  const seen: Set<string> = new Set();
  const combined: string[] = [];
  const current: string[] = (process.env.PATH ?? "").split(":");
  for (const dir of [...extra, ...current]) {
    if (dir.length > 0 && !seen.has(dir)) {
      seen.add(dir);
      combined.push(dir);
    }
  }
  process.env.PATH = combined.join(":");
}

augmentPath();

// ─── Small helpers ───────────────────────────────────────────────────────────

function log(msg: string): void {
  const line: string = `[${new Date().toISOString()}] ${msg}`;
  appendFileSync(LOG_PATH, line + "\n");
  process.stdout.write(line + "\n");
}

function fatal(msg: string): never {
  const line: string = `[${new Date().toISOString()}] FATAL: ${msg}`;
  appendFileSync(LOG_PATH, line + "\n");
  process.stderr.write(line + "\n");
  process.exit(1);
}

function which(name: string): string | null {
  const dirs: string[] = (process.env.PATH ?? "").split(":");
  for (const dir of dirs) {
    if (dir.length === 0) {
      continue;
    }
    const candidate: string = join(dir, name);
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

function runRaw(bin: string, args: string[], opts?: { cwd?: string }): ExecResult {
  const r = execaSync(bin, args, {
    cwd: opts?.cwd,
    encoding: "utf8",
    reject: false,
    stdin: "ignore",
  });
  return {
    code: r.exitCode ?? -1,
    stdout: typeof r.stdout === "string" ? r.stdout : "",
    stderr: typeof r.stderr === "string" ? r.stderr : "",
  };
}

function repoRoot(): string {
  const r: ExecResult = runRaw("git", ["rev-parse", "--show-toplevel"], {
    cwd: PROJECT_ROOT,
  });
  if (r.code !== 0) {
    fatal("Could not determine git repo root.");
  }
  return r.stdout.trim();
}

/** Minimal numeric semver-ish compare — SDK versions here are plain x.y.z. */
function isNewer(latest: string, current: string): boolean {
  const a: number[] = latest.split(".").map((n) => parseInt(n, 10) || 0);
  const b: number[] = current.split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const ai: number = a[i] ?? 0;
    const bi: number = b[i] ?? 0;
    if (ai !== bi) {
      return ai > bi;
    }
  }
  return false;
}

// ─── Lock (PID file + staleness) ─────────────────────────────────────────────

function acquireLock(): boolean {
  const writePid = (): boolean => {
    try {
      writeFileSync(LOCK_PATH, String(process.pid), { flag: "wx" });
      process.on("exit", () => {
        try {
          unlinkSync(LOCK_PATH);
        } catch {
          /* already removed */
        }
      });
      return true;
    } catch {
      return false;
    }
  };

  if (writePid()) {
    return true;
  }

  let pid: number = Number.NaN;
  try {
    pid = parseInt(readFileSync(LOCK_PATH, "utf8").trim(), 10);
  } catch {
    return false;
  }

  if (Number.isNaN(pid)) {
    return false;
  }
  try {
    process.kill(pid, 0);
    return false; // still running
  } catch {
    try {
      unlinkSync(LOCK_PATH);
    } catch {
      /* ignore */
    }
    return writePid();
  }
}

// ─── State ───────────────────────────────────────────────────────────────────

function loadState(): UpdateState {
  try {
    const raw: string = readFileSync(STATE_PATH, "utf8");
    const parsed: UpdateState = JSON.parse(raw);
    return parsed;
  } catch {
    return { lastAttemptedVersion: null, lastOutcome: null, lastAttemptAt: null };
  }
}

function saveState(state: UpdateState): void {
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

// ─── SDK version check ────────────────────────────────────────────────────────

function currentSdkVersion(): string {
  const pkgPath: string = join(PROJECT_ROOT, "package.json");
  const pkg: { dependencies?: Record<string, string> } = JSON.parse(
    readFileSync(pkgPath, "utf8"),
  );
  const raw: string | undefined = pkg.dependencies?.[SDK_PACKAGE];
  if (raw == null) {
    fatal(`${SDK_PACKAGE} not found in ${pkgPath} dependencies.`);
  }
  return raw.replace(/^[\^~]/, "");
}

function latestSdkVersion(): string {
  const r: ExecResult = runRaw("npm", ["view", SDK_PACKAGE, "version"]);
  if (r.code !== 0) {
    fatal(`npm view ${SDK_PACKAGE} version failed: ${r.stderr.trim()}`);
  }
  return r.stdout.trim();
}

// ─── git worktree ────────────────────────────────────────────────────────────

function worktreeProjectDir(worktreePath: string): string {
  // scripts/ is directly under nextjs/, so nextjs/ itself is one path segment
  // below the repo root — mirror that same single-segment relationship here.
  return join(worktreePath, "nextjs");
}

function addWorktree(root: string, branch: string): string {
  const parent: string = join(dirname(root), ".worktrees");
  mkdirSync(parent, { recursive: true });
  const path: string = join(parent, branch.replace(/\//g, "-"));

  // Always base the branch on up-to-date origin/main rather than whatever ref
  // the primary checkout's HEAD happens to be on — a cron run shouldn't
  // silently inherit a stale local checkout or a feature branch.
  const fetch: ExecResult = runRaw("git", ["fetch", "origin", "main"], { cwd: root });
  if (fetch.code !== 0) {
    fatal(`git fetch origin main failed: ${fetch.stderr.trim()}`);
  }

  // `-B` (re)creates `branch` pointing at origin/main even if it already
  // exists from a prior attempt — a previous run may have committed a
  // partial SDK bump before failing/timing out (SKILL.md Stage 7 commits
  // even on a blocked run), and reusing that content as-is would leave
  // package.json already bumped, which breaks installDeps()'s "matches
  // origin/main" baseline assumption below (Stage 0's node_modules
  // type-snapshot would already be the *new* version, so Stage 1 would think
  // there's nothing to do and skip the rest of the work). Nothing here
  // relies on resuming mid-progress across separate opencode invocations —
  // each run reads the skill from scratch — so a clean, reproducible start
  // point matters more than preserving a stuck attempt's partial commits.
  const r: ExecResult = runRaw(
    "git",
    ["worktree", "add", "-B", branch, path, "origin/main"],
    { cwd: root },
  );
  if (r.code !== 0) {
    fatal(`git worktree add failed: ${r.stderr.trim()}`);
  }
  return path;
}

function removeWorktree(root: string, path: string): void {
  runRaw("git", ["worktree", "remove", "--force", path], { cwd: root });
}

/**
 * Fresh worktrees have no `node_modules` — install before invoking the skill.
 * This isn't just for the skill's typecheck/lint/build stages: Stage 0 snapshots
 * `node_modules/@fiberai/sdk/dist/index.d.ts` as the "old version" baseline that
 * Stage 2's whole breaking-change detection depends on, and that file doesn't
 * exist until this runs.
 *
 * Returns false (rather than calling `fatal`/`process.exit`) on failure so the
 * caller's try/finally still runs `removeWorktree` and records the attempt in
 * state.json — a hard exit here would skip both, leaving the worktree stuck
 * on disk and every subsequent run failing the same way in `addWorktree`.
 */
function installDeps(projectDir: string): boolean {
  log(`Installing dependencies in ${projectDir} (npm ci)...`);
  const r: ExecResult = runRaw("npm", ["ci"], { cwd: projectDir });
  if (r.code !== 0) {
    log(`npm ci failed in ${projectDir}: ${r.stderr.trim()}`);
    return false;
  }
  return true;
}

/**
 * Fresh worktrees don't inherit gitignored `.env*` files — copy them over
 * from the primary checkout so the E2E suite (Stage 6 of the skill) has
 * E2E_FIBER_API_KEY available. Never overwrites an existing file.
 */
function ensureEnvFiles(worktreePath: string): void {
  const target: string = worktreeProjectDir(worktreePath);
  let names: string[] = [];
  try {
    names = readdirSync(PROJECT_ROOT);
  } catch (error: unknown) {
    const msg: string = error instanceof Error ? error.message : String(error);
    log(`ensureEnvFiles — failed to read ${PROJECT_ROOT}: ${msg}`);
    return;
  }
  for (const name of names.filter((n) => n.startsWith(".env"))) {
    const dest: string = join(target, name);
    if (existsSync(dest)) {
      continue;
    }
    try {
      writeFileSync(dest, readFileSync(join(PROJECT_ROOT, name), "utf8"));
      log(`ensureEnvFiles — copied ${name} into ${target}.`);
    } catch (error: unknown) {
      const msg: string = error instanceof Error ? error.message : String(error);
      log(`ensureEnvFiles — failed to copy ${name}: ${msg}`);
    }
  }
}

// ─── opencode (headless, via execa with built-in timeout) ───────────────────

async function runOpencode(
  runDir: string,
  version: string,
): Promise<{ code: number; timedOut: boolean }> {
  const opencodeLog: string = join(STATE_DIR, `opencode-${version}.log`);
  writeFileSync(
    opencodeLog,
    `$ opencode run --command ${OPENCODE_COMMAND} --auto --dir ${runDir}\n`,
  );
  const append = (data: Buffer): void => {
    const text: string = data.toString();
    appendFileSync(opencodeLog, text);
    process.stdout.write(text);
  };

  const subprocess = execa(
    "opencode",
    ["run", "--command", OPENCODE_COMMAND, "--auto", "--dir", runDir],
    {
      cwd: runDir,
      timeout: OPENCODE_TIMEOUT_MS,
      encoding: "utf8",
      buffer: false,
      reject: false,
      stdin: "ignore",
    },
  );
  subprocess.stdout?.on("data", append);
  subprocess.stderr?.on("data", append);

  try {
    const result = await subprocess;
    const timedOut: boolean = result.timedOut === true;
    if (timedOut) {
      append(
        Buffer.from(
          `\n[TIMEOUT after ${Math.round(OPENCODE_TIMEOUT_MS / 60000)}m — killed]\n`,
        ),
      );
    }
    return { code: result.exitCode ?? -1, timedOut };
  } catch (error) {
    const msg: string = error instanceof Error ? error.message : String(error);
    append(Buffer.from(`\n[opencode error] ${msg}\n`));
    return { code: -1, timedOut: false };
  }
}

// ─── Args + help ─────────────────────────────────────────────────────────────

function printHelp(): void {
  process.stdout.write(
    [
      "openfiber-update-check — keep @fiberai/sdk current in OpenFiber",
      "",
      "Usage: npx tsx scripts/openfiber-update-check.mts [options]",
      "",
      "Options:",
      "  --dry-run   check the published version only, don't act",
      "  --force     re-run even if this exact version was already attempted",
      "  -h, --help  show this help",
      "",
    ].join("\n"),
  );
}

function parseArgs(args: string[]): ParsedArgs {
  let dryRun: boolean = false;
  let force: boolean = false;
  for (const arg of args) {
    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else if (arg === "--dry-run") {
      dryRun = true;
    } else if (arg === "--force") {
      force = true;
    } else {
      fatal(`Unknown argument: ${arg}`);
    }
  }
  return { dryRun, force };
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const opts: ParsedArgs = parseArgs(process.argv.slice(2));

  for (const bin of REQUIRED_BINS) {
    if (which(bin) == null) {
      fatal(`Required binary "${bin}" not found on PATH.`);
    }
  }

  if (!acquireLock()) {
    log("Another openfiber-update-check run is in progress; exiting.");
    process.exit(0);
  }

  const current: string = currentSdkVersion();
  const latest: string = latestSdkVersion();
  log(`${SDK_PACKAGE}: current=${current} latest=${latest}`);

  if (!isNewer(latest, current)) {
    log("Already up to date — nothing to do.");
    return;
  }

  const state: UpdateState = loadState();
  if (!opts.force && state.lastAttemptedVersion === latest) {
    log(
      `Already attempted v${latest} (outcome: ${state.lastOutcome ?? "unknown"} at ${state.lastAttemptAt ?? "?"}). ` +
        `Delete ${STATE_PATH} or pass --force to retry.`,
    );
    return;
  }

  log(`New version available (v${current} -> v${latest}).`);
  if (opts.dryRun) {
    log("DRY RUN — would create a worktree and run opencode. Stopping here.");
    return;
  }

  const root: string = repoRoot();
  const branch: string = `chore/openfiber-update-${latest}`;
  const worktreePath: string = addWorktree(root, branch);
  log(`Created worktree at ${worktreePath} on branch ${branch}.`);

  let outcome: "success" | "failure" = "failure";
  try {
    const projectDir: string = worktreeProjectDir(worktreePath);
    ensureEnvFiles(worktreePath);
    // Install with the *old* SDK version still pinned (addWorktree always
    // resets the branch to origin/main, so package.json here matches it) so
    // Stage 0's node_modules type-snapshot baseline exists before the skill
    // bumps it in Stage 1.
    if (!installDeps(projectDir)) {
      log("Skipping opencode run — dependency install failed.");
    } else {
      log(`Running /${OPENCODE_COMMAND} in ${projectDir} (headless, --auto).`);
      const result: { code: number; timedOut: boolean } = await runOpencode(
        projectDir,
        latest,
      );
      outcome = result.code === 0 && !result.timedOut ? "success" : "failure";
      log(
        `/${OPENCODE_COMMAND} finished: ${result.timedOut ? "TIMEOUT" : `exit ${result.code}`} -> ${outcome}.`,
      );
    }
  } finally {
    removeWorktree(root, worktreePath);
    log(`Worktree removed (branch "${branch}" kept locally).`);
  }

  saveState({
    lastAttemptedVersion: latest,
    lastOutcome: outcome,
    lastAttemptAt: new Date().toISOString(),
  });
  log(`openfiber-update-check done — outcome: ${outcome}.`);
}

main().catch((err: unknown) => {
  const msg: string = err instanceof Error ? err.message : String(err);
  fatal(`Unhandled error: ${msg}`);
});
