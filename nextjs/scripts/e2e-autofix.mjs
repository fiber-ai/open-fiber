#!/usr/bin/env node
// Files a Linear issue when the nightly/PR E2E run fails, so fiber-ai/autosolver's
// existing pipeline can pick it up (see FIB-18659 plan, Phase 4). This script only
// reports the failure — it does not diagnose, fix, or touch code/PRs itself.
//
// Requires: LINEAR_API_KEY, RUN_ID, RUN_URL, HEAD_SHA env vars, and a
// failure-log.txt file in the working directory (written by the calling workflow
// via `gh run view --log-failed`).

import { readFileSync, existsSync } from "node:fs";

const LINEAR_API_URL = "https://api.linear.app/graphql";
const LINEAR_API_KEY = process.env.LINEAR_API_KEY;
const RUN_ID = process.env.RUN_ID;
const RUN_URL = process.env.RUN_URL;
const HEAD_SHA = process.env.HEAD_SHA;

// Fiber Core (FIB) team — confirmed via mcp__linear__list_teams during planning.
const FIB_TEAM_ID = "fbff5609-046c-4a79-bf27-e0a7a8f67e93";

const AUTOSOLVE_LABEL_NAME = "Autosolve";
// Doesn't exist yet as of writing (open-fiber isn't onboarded to autosolver yet) —
// the issue still gets filed without it; see the workflow file's header comment.
const REPO_LABEL_NAME = "openfiber";

const MAX_LOG_CHARS = 6000;

if (!LINEAR_API_KEY) {
  console.error("LINEAR_API_KEY is not set — cannot file a Linear issue.");
  process.exit(1);
}
if (!RUN_ID || !RUN_URL) {
  console.error("RUN_ID/RUN_URL are not set — expected to be passed from the workflow_run event.");
  process.exit(1);
}

async function linearGraphQL(query, variables) {
  const res = await fetch(LINEAR_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // Linear personal/workspace API keys go in Authorization unprefixed
      // (no "Bearer "), unlike OAuth access tokens.
      Authorization: LINEAR_API_KEY,
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (!res.ok || json.errors) {
    throw new Error(`Linear API error: ${res.status} ${JSON.stringify(json.errors ?? json)}`);
  }
  return json.data;
}

async function findExistingIssue() {
  const data = await linearGraphQL(
    `query($teamId: ID!, $runId: String!) {
      issues(
        filter: {
          team: { id: { eq: $teamId } }
          title: { contains: $runId }
          state: { type: { nin: ["completed", "canceled"] } }
        }
        first: 5
      ) {
        nodes { id identifier title url }
      }
    }`,
    { teamId: FIB_TEAM_ID, runId: RUN_ID }
  );
  return data.issues.nodes[0] ?? null;
}

async function findLabelIds() {
  const data = await linearGraphQL(
    `query($names: [String!]!) {
      issueLabels(filter: { name: { in: $names } }) {
        nodes { id name }
      }
    }`,
    { names: [AUTOSOLVE_LABEL_NAME, REPO_LABEL_NAME] }
  );
  const byName = new Map(data.issueLabels.nodes.map((l) => [l.name, l.id]));
  return {
    autosolveId: byName.get(AUTOSOLVE_LABEL_NAME) ?? null,
    repoLabelId: byName.get(REPO_LABEL_NAME) ?? null,
  };
}

async function createIssue({ title, description, labelIds }) {
  const data = await linearGraphQL(
    `mutation($input: IssueCreateInput!) {
      issueCreate(input: $input) {
        success
        issue { id identifier url }
      }
    }`,
    { input: { teamId: FIB_TEAM_ID, title, description, labelIds } }
  );
  if (!data.issueCreate.success) {
    throw new Error("issueCreate returned success: false");
  }
  return data.issueCreate.issue;
}

function readFailureLog() {
  if (!existsSync("failure-log.txt")) return "(no failure log captured)";
  const raw = readFileSync("failure-log.txt", "utf8");
  return raw.length > MAX_LOG_CHARS
    ? raw.slice(0, MAX_LOG_CHARS) + "\n\n...(truncated)"
    : raw;
}

async function main() {
  const existing = await findExistingIssue();
  if (existing) {
    console.log(`Issue already filed for run ${RUN_ID}: ${existing.identifier} (${existing.url}) — skipping.`);
    return;
  }

  const { autosolveId, repoLabelId } = await findLabelIds();
  if (!autosolveId) {
    console.error(`"${AUTOSOLVE_LABEL_NAME}" label not found in Linear — filing without it.`);
  }
  if (!repoLabelId) {
    console.warn(
      `"${REPO_LABEL_NAME}" label not found in Linear — filing without it. ` +
        `autosolver won't pick this issue up until open-fiber is onboarded ` +
        `(see the FIB-18659 plan, Phase 4) and this label exists.`
    );
  }

  const log = readFailureLog();
  const title = `E2E failure: ${RUN_ID} on open-fiber`;
  const description = [
    `Nightly/PR E2E run failed on \`open-fiber\`.`,
    ``,
    `- Run: ${RUN_URL}`,
    `- Commit: ${HEAD_SHA ?? "(unknown)"}`,
    ``,
    `### Failure log (\`gh run view --log-failed\`, truncated)`,
    "```",
    log,
    "```",
  ].join("\n");

  const labelIds = [autosolveId, repoLabelId].filter(Boolean);
  const issue = await createIssue({ title, description, labelIds });
  console.log(`Filed ${issue.identifier}: ${issue.url}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
