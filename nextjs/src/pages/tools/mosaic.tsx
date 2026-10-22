import { useEffect, useState } from "react";
import { Sparkles, Loader2, Download, FileSpreadsheet, History, Trash2, CheckCircle2, XCircle, Gift, FileText, Table2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorDisplay } from "@/components/shared/error-display";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { Markdown } from "@/components/shared/markdown";
import { ToggleButtonGroup } from "@/components/shared/toggle-button-group";
import { cn } from "@/lib/utils";

interface SavedRun { runId: string; sourceUrl: string; createdAt: string }
const STORAGE_KEY = "openfiber-mosaic-runs";
const loadRuns = (): SavedRun[] => {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]"); } catch { return []; }
};
const saveRuns = (runs: SavedRun[]) => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(runs.slice(0, 20))); } catch { /* storage unavailable */ } };

const shortUrl = (u: string) => { try { const x = new URL(u); return x.hostname + x.pathname.slice(0, 32) + (x.pathname.length > 32 ? "…" : ""); } catch { return u; } };

/** Input rows → profile found → contact details, as a stepped funnel. */
function Funnel({ stats }: { stats: { inputRows: number; outputRows: number; rowsWhereProfileFound: number; rowsWithContactDetails: number; rowsWithErrors: number } }) {
  const base = Math.max(1, stats.inputRows);
  const steps = [
    { label: "Input rows", n: stats.inputRows, cls: "bg-slate-400" },
    { label: "Profile found", n: stats.rowsWhereProfileFound, cls: "bg-sky-500" },
    { label: "With contact details", n: stats.rowsWithContactDetails, cls: "bg-emerald-500" },
  ];
  return (
    <div className="space-y-2">
      {steps.map((s) => (
        <div key={s.label} className="grid grid-cols-[10rem_1fr_6rem] items-center gap-3 text-sm">
          <span className="text-muted-foreground">{s.label}</span>
          <span className="h-5 rounded bg-muted"><span className={cn("block h-5 rounded", s.cls)} style={{ width: `${(s.n / base) * 100}%` }} /></span>
          <span className="text-right tabular-nums">{s.n.toLocaleString()} <span className="text-xs text-muted-foreground">{Math.round((s.n / base) * 100)}%</span></span>
        </div>
      ))}
      {stats.rowsWithErrors > 0 && <p className="text-xs text-amber-600">{stats.rowsWithErrors.toLocaleString()} rows had errors</p>}
    </div>
  );
}

function Results({ runId, csvUrl }: { runId: string; csvUrl: string | null }) {
  const [view, setView] = useState<"report" | "table">("report");
  const q = trpc.mosaic.results.useQuery({ runId }, { staleTime: Infinity, retry: 1 });
  if (q.isLoading) return <LoadingSkeleton rows={4} />;
  if (q.isError) return <ErrorDisplay message={q.error.message} onRetry={() => q.refetch()} />;
  const d = q.data!;
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <ToggleButtonGroup<"report" | "table"> value={view} onChange={setView} options={[{ value: "report", label: "Report", icon: FileText }, { value: "table", label: "Healed data", icon: Table2 }]} />
        {csvUrl && <a href={csvUrl} target="_blank" rel="noreferrer"><Button size="sm"><Download className="mr-1.5 h-3.5 w-3.5" />Download CSV</Button></a>}
      </CardHeader>
      <CardContent>
        {view === "report"
          ? (d.report ? <Markdown>{d.report}</Markdown> : <p className="text-sm text-muted-foreground">No report for this run.</p>)
          : (
            <div className="space-y-2">
              <div className="max-h-[32rem] overflow-auto rounded-md border">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-muted text-muted-foreground"><tr>{d.header.map((h, i) => <th key={i} className="whitespace-nowrap px-2 py-1.5 text-left font-medium">{h}</th>)}</tr></thead>
                  <tbody className="divide-y">
                    {d.rows.map((r, i) => <tr key={i}>{d.header.map((_, j) => <td key={j} className="max-w-[16rem] truncate whitespace-nowrap px-2 py-1" title={r[j]}>{r[j]}</td>)}</tr>)}
                  </tbody>
                </table>
              </div>
              {d.truncated && <p className="text-xs text-muted-foreground">Showing the first {d.rows.length} rows. Download the CSV for everything.</p>}
            </div>
          )}
      </CardContent>
    </Card>
  );
}

function RunView({ runId }: { runId: string }) {
  const q = trpc.mosaic.poll.useQuery({ runId }, {
    refetchInterval: (s) => (["done", "failed"].includes(s.state.data?.output.run.status ?? "") ? false : 5000),
  });
  if (q.isLoading) return <LoadingSkeleton rows={3} />;
  if (q.isError) return <ErrorDisplay message={q.error.message} onRetry={() => q.refetch()} />;
  const run = q.data!.output.run;
  const pct = run.rowCount ? Math.round(((run.processedRowCount ?? 0) / run.rowCount) * 100) : null;
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-4 pt-5">
          <div className="flex flex-wrap items-center gap-2">
            {run.status === "done" ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : run.status === "failed" ? <XCircle className="h-5 w-5 text-destructive" /> : <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
            <span className="font-medium capitalize">{run.status === "pending" ? "Queued" : run.status === "running" ? "Healing your file…" : run.status === "done" ? "Done" : "Failed"}</span>
            {run.isFreeTrialRun && <Badge variant="secondary"><Gift className="mr-1 h-3 w-3" />Free trial run</Badge>}
            <span className="ml-auto font-mono text-xs text-muted-foreground">{run.runId}</span>
          </div>
          {(run.status === "running" || run.status === "pending") && (
            <div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className={cn("h-2 rounded-full bg-primary transition-all", pct == null && "w-1/3 animate-pulse")} style={pct != null ? { width: `${pct}%` } : undefined} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {run.rowCount ? `${(run.processedRowCount ?? 0).toLocaleString()} of ${run.rowCount.toLocaleString()} rows` : "Parsing file…"} · checking every 5s
              </p>
            </div>
          )}
          {run.stats && <Funnel stats={run.stats} />}
        </CardContent>
      </Card>
      {run.status === "done" && <Results runId={run.runId} csvUrl={run.outputCsvUrl} />}
    </div>
  );
}

export default function MosaicPage() {
  const [sourceUrl, setSourceUrl] = useState("");
  const [instructions, setInstructions] = useState("");
  const [contact, setContact] = useState({ getWorkEmails: false, getPersonalEmails: false, getPhoneNumbers: false });
  const [companyDetails, setCompanyDetails] = useState(false);
  const [liveFetch, setLiveFetch] = useState(true);
  const [redline, setRedline] = useState(false);
  const [maxRows, setMaxRows] = useState("");
  const [runs, setRuns] = useState<SavedRun[]>([]);
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => { setRuns(loadRuns()); }, []);

  const start = trpc.mosaic.start.useMutation({
    onSuccess: (d) => {
      const next = [{ runId: d.output.runId, sourceUrl: sourceUrl.trim(), createdAt: new Date().toISOString() }, ...runs.filter((r) => r.runId !== d.output.runId)];
      saveRuns(next); setRuns(next); setActive(d.output.runId);
    },
  });

  const submit = () => start.mutate({
    sourceUrl: sourceUrl.trim(),
    customInstructions: instructions.trim() || undefined,
    contactInfo: contact,
    includeCompanyDetails: companyDetails,
    liveFetch,
    runRedline: redline,
    maxRows: maxRows ? Number(maxRows) : undefined,
  });

  const removeRun = (id: string) => { const next = runs.filter((r) => r.runId !== id); saveRuns(next); setRuns(next); if (active === id) setActive(null); };

  return (
    <div className="flex h-full flex-col">
      <Header icon={Sparkles} title="Mosaic" description="Heal and enrich a messy spreadsheet of people: fix LinkedIn URLs, fill gaps, add contacts" />
      <div className="flex min-h-0 flex-1">
        <div className="hidden w-64 shrink-0 overflow-y-auto border-r p-3 lg:block">
          <p className="mb-2 flex items-center gap-1.5 px-1 text-xs font-medium uppercase tracking-wider text-muted-foreground"><History className="h-3 w-3" />Runs</p>
          <button type="button" onClick={() => setActive(null)} className={cn("mb-1 w-full rounded-md px-2 py-1.5 text-left text-sm", active === null ? "bg-accent font-medium" : "hover:bg-muted")}>+ New run</button>
          {runs.map((r) => (
            <div key={r.runId} className={cn("group flex items-center rounded-md", active === r.runId ? "bg-accent" : "hover:bg-muted")}>
              <button type="button" onClick={() => setActive(r.runId)} className="min-w-0 flex-1 px-2 py-1.5 text-left">
                <p className="truncate text-xs font-medium">{shortUrl(r.sourceUrl)}</p>
                <p className="text-[11px] text-muted-foreground" suppressHydrationWarning>{new Date(r.createdAt).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}</p>
              </button>
              <button type="button" onClick={() => removeRun(r.runId)} className="mr-1 hidden rounded p-1 text-muted-foreground hover:text-destructive group-hover:block" aria-label="Forget run"><Trash2 className="h-3 w-3" /></button>
            </div>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-4xl space-y-6">
            {active ? <RunView key={active} runId={active} /> : (
              <Card>
                <CardHeader><CardTitle className="text-base">New Mosaic run</CardTitle></CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">File link</Label>
                    <Input placeholder="https://docs.google.com/spreadsheets/d/…" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} />
                    <p className="text-xs text-muted-foreground">CSV, XLSX, TXT (one LinkedIn URL per line) or a Google Sheet. Google Drive, Dropbox and OneDrive share links work too, as long as anyone with the link can view.</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Extra instructions (optional)</Label>
                    <Textarea rows={3} placeholder="These are all doctors — get office phones, not home phones." value={instructions} onChange={(e) => setInstructions(e.target.value)} />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <p className="text-xs font-medium">Add contact info</p>
                      <label className="flex items-center gap-2 text-sm"><Checkbox checked={contact.getWorkEmails} onCheckedChange={(v) => setContact((c) => ({ ...c, getWorkEmails: v === true }))} />Work emails</label>
                      <label className="flex items-center gap-2 text-sm"><Checkbox checked={contact.getPersonalEmails} onCheckedChange={(v) => setContact((c) => ({ ...c, getPersonalEmails: v === true }))} />Personal emails</label>
                      <label className="flex items-center gap-2 text-sm"><Checkbox checked={contact.getPhoneNumbers} onCheckedChange={(v) => setContact((c) => ({ ...c, getPhoneNumbers: v === true }))} />Phone numbers</label>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-medium">Options</p>
                      <label className="flex items-start gap-2 text-sm"><Checkbox className="mt-0.5" checked={companyDetails} onCheckedChange={(v) => setCompanyDetails(v === true)} /><span>Company details<span className="block text-xs text-muted-foreground">Funding, offices, headcount for each current employer</span></span></label>
                      <label className="flex items-start gap-2 text-sm"><Checkbox className="mt-0.5" checked={liveFetch} onCheckedChange={(v) => setLiveFetch(v === true)} /><span>Live fetch<span className="block text-xs text-muted-foreground">Fetch fresh profiles and recover broken URLs. No extra charge</span></span></label>
                      <label className="flex items-start gap-2 text-sm"><Checkbox className="mt-0.5" checked={redline} onCheckedChange={(v) => setRedline(v === true)} /><span>Redline<span className="block text-xs text-muted-foreground">Flag rows where your data is stale or doesn&apos;t match</span></span></label>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="flex flex-col gap-1.5"><Label className="text-xs font-medium">Max rows (optional)</Label><Input type="number" min={1} max={20000} placeholder="All (≤20,000)" value={maxRows} onChange={(e) => setMaxRows(e.target.value)} className="w-40" /></div>
                    <Button onClick={submit} disabled={start.isPending || !/^https:\/\/\S+$/.test(sourceUrl.trim())}>
                      {start.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}Start healing
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Credits are charged once the file is parsed, based on row count and the options above. Your org&apos;s first run may be a free trial (first 1,000 rows free).</p>
                  {start.isError && <p className="text-sm text-destructive">{start.error.message}</p>}
                </CardContent>
              </Card>
            )}
            {!active && runs.length === 0 && (
              <EmptyState icon={FileSpreadsheet} title="No runs yet" description="Mosaic reads your file, figures out who each row is, repairs LinkedIn URLs, and returns a cleaned CSV plus a summary report." />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
