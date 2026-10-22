import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { startMosaic, pollMosaic } from "@fiberai/sdk";
import { createTRPCRouter, protectedProcedure, callFiber } from "../trpc";

const runSchema = z.object({
  runId: z.string(),
  status: z.enum(["pending", "running", "done", "failed"]),
  rowCount: z.number().nullable(),
  processedRowCount: z.number().nullable(),
  isFreeTrialRun: z.boolean(),
  stats: z.object({
    inputRows: z.number(),
    outputRows: z.number(),
    rowsWhereProfileFound: z.number(),
    rowsWithContactDetails: z.number(),
    rowsWithErrors: z.number(),
  }).nullable(),
  outputCsvUrl: z.string().nullable(),
  reportUrl: z.string().nullable(),
}).passthrough();

const PREVIEW_ROWS = 100;
const MAX_BYTES = 2_000_000;

/** Minimal RFC 4180 parser — enough for previewing the first rows of Mosaic's output. */
function parseCsv(text: string, maxRows: number): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length && rows.length <= maxRows; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += c;
  }
  if ((field || row.length) && rows.length <= maxRows) { row.push(field); rows.push(row); }
  return rows;
}

async function fetchText(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `Couldn't download Mosaic output (${res.status})` });
  const buf = await res.arrayBuffer();
  return new TextDecoder().decode(buf.byteLength > MAX_BYTES ? buf.slice(0, MAX_BYTES) : buf);
}

export const mosaicRouter = createTRPCRouter({
  start: protectedProcedure
    .input(z.object({
      sourceUrl: z.string().url().startsWith("https://", "Must be an https:// link"),
      customInstructions: z.string().trim().max(2000).optional(),
      contactInfo: z.object({ getWorkEmails: z.boolean(), getPersonalEmails: z.boolean(), getPhoneNumbers: z.boolean() }).optional(),
      includeCompanyDetails: z.boolean().default(false),
      liveFetch: z.boolean().default(true),
      runRedline: z.boolean().default(false),
      maxRows: z.number().int().min(1).max(20_000).optional(),
    }))
    .output(z.object({ output: z.object({ runId: z.string(), isFreeTrialRun: z.boolean() }).passthrough() }).passthrough())
    .mutation(async ({ ctx, input }) => {
      const contact = input.contactInfo && Object.values(input.contactInfo).some(Boolean) ? input.contactInfo : null;
      return callFiber(() => startMosaic({
        body: {
          apiKey: ctx.apiKey,
          sourceUrl: input.sourceUrl,
          customInstructions: input.customInstructions || null,
          options: {
            contactInfo: contact,
            includeCompanyDetails: input.includeCompanyDetails,
            liveFetch: input.liveFetch,
            runRedline: input.runRedline,
            maxRows: input.maxRows ?? null,
          },
        },
      }));
    }),

  poll: protectedProcedure
    .input(z.object({ runId: z.string().min(1) }))
    .output(z.object({ output: z.object({ run: runSchema }).passthrough() }).passthrough())
    .query(async ({ ctx, input }) => {
      return callFiber(() => pollMosaic({ body: { apiKey: ctx.apiKey, runId: input.runId } }));
    }),

  /**
   * Downloads the finished run's report + CSV server-side (no CORS issues) and returns
   * the markdown report and the first rows of the CSV. Only fetches URLs that pollMosaic
   * itself returned for this run, never caller-supplied ones.
   */
  results: protectedProcedure
    .input(z.object({ runId: z.string().min(1) }))
    .output(z.object({
      report: z.string().nullable(),
      header: z.array(z.string()),
      rows: z.array(z.array(z.string())),
      truncated: z.boolean(),
    }))
    .query(async ({ ctx, input }) => {
      const { output } = await callFiber(() => pollMosaic({ body: { apiKey: ctx.apiKey, runId: input.runId } }));
      const run = output.run;
      if (run.status !== "done") throw new TRPCError({ code: "BAD_REQUEST", message: "Run isn't finished yet" });
      const [report, csv] = await Promise.all([
        run.reportUrl ? fetchText(run.reportUrl) : Promise.resolve(null),
        run.outputCsvUrl ? fetchText(run.outputCsvUrl) : Promise.resolve(""),
      ]);
      const parsed = csv ? parseCsv(csv, PREVIEW_ROWS) : [];
      const [header = [], ...rows] = parsed;
      return { report, header, rows: rows.slice(0, PREVIEW_ROWS), truncated: rows.length >= PREVIEW_ROWS || (run.stats?.outputRows ?? 0) > rows.length };
    }),
});
