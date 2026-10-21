import { Fragment, useMemo, useState } from "react";
import { History, Loader2, Download, Search, ChevronDown, ChevronRight, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorDisplay } from "@/components/shared/error-display";
import { JsonView } from "@/components/shared/json-view";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { ToggleButtonGroup } from "@/components/shared/toggle-button-group";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ApiRequest {
  id: string;
  createdAt: string;
  method: string;
  routePath: string;
  statusCode: number;
  durationMs?: number | null;
  errorCode?: string | null;
  request?: unknown;
}

type Range = "1h" | "24h" | "7d" | "14d";
const RANGE_MS: Record<Range, number> = { "1h": 3600e3, "24h": 86400e3, "7d": 7 * 86400e3, "14d": 14 * 86400e3 };

const statusTone = (s: number) =>
  s >= 500 ? "bg-red-500" : s >= 400 ? "bg-amber-500" : s >= 300 ? "bg-sky-500" : "bg-emerald-500";
const statusText = (s: number) =>
  s >= 500 ? "text-red-600 dark:text-red-400" : s >= 400 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400";

const fmtTime = (iso: string) => {
  try { return new Date(iso).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" }); } catch { return iso; }
};
const fmtMs = (ms?: number | null) => (ms == null ? "—" : ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`);

function percentile(values: number[], p: number) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
}

function toCsv(rows: ApiRequest[]) {
  const esc = (v: unknown) => {
    const s = v == null ? "" : typeof v === "string" ? v : JSON.stringify(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const cols = ["createdAt", "method", "routePath", "statusCode", "durationMs", "errorCode", "id", "request"] as const;
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
}

function saveFile(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

/** Summary of what's loaded: status mix bar, latency, busiest routes. */
function Summary({ rows }: { rows: ApiRequest[] }) {
  const stats = useMemo(() => {
    const buckets = { "2xx": 0, "3xx": 0, "4xx": 0, "5xx": 0 };
    const routes = new Map<string, { n: number; errors: number }>();
    const durations: number[] = [];
    for (const r of rows) {
      const b = `${Math.floor(r.statusCode / 100)}xx` as keyof typeof buckets;
      if (b in buckets) buckets[b]++;
      const cur = routes.get(r.routePath) ?? { n: 0, errors: 0 };
      cur.n++;
      if (r.statusCode >= 400) cur.errors++;
      routes.set(r.routePath, cur);
      if (r.durationMs != null) durations.push(r.durationMs);
    }
    const top = Array.from(routes.entries()).sort((a, b) => b[1].n - a[1].n).slice(0, 5);
    return { buckets, top, p50: percentile(durations, 50), p95: percentile(durations, 95) };
  }, [rows]);

  const total = rows.length || 1;
  const errorRate = ((stats.buckets["4xx"] + stats.buckets["5xx"]) / total) * 100;
  const maxRoute = stats.top[0]?.[1].n ?? 1;
  const tones: Record<string, string> = { "2xx": "bg-emerald-500", "3xx": "bg-sky-500", "4xx": "bg-amber-500", "5xx": "bg-red-500" };

  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Card>
        <CardContent className="space-y-4 pt-5">
          <div className="grid grid-cols-3 gap-3">
            <div><p className="text-xs text-muted-foreground">Requests loaded</p><p className="text-2xl font-semibold tabular-nums">{rows.length.toLocaleString()}</p></div>
            <div><p className="text-xs text-muted-foreground">Error rate</p><p className={cn("text-2xl font-semibold tabular-nums", errorRate > 5 && "text-red-600 dark:text-red-400")}>{errorRate.toFixed(1)}%</p></div>
            <div><p className="text-xs text-muted-foreground">Latency p50 / p95</p><p className="text-2xl font-semibold tabular-nums">{fmtMs(stats.p50)}<span className="text-base text-muted-foreground"> / {fmtMs(stats.p95)}</span></p></div>
          </div>
          <div>
            <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
              {Object.entries(stats.buckets).map(([k, n]) => n > 0 && (
                <div key={k} className={tones[k]} style={{ width: `${(n / total) * 100}%` }} title={`${k}: ${n}`} />
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
              {Object.entries(stats.buckets).map(([k, n]) => (
                <span key={k} className="flex items-center gap-1.5"><span className={cn("h-2 w-2 rounded-full", tones[k])} />{k} <span className="tabular-nums">{n}</span></span>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-2 pt-5">
          <p className="text-xs text-muted-foreground">Busiest routes</p>
          {stats.top.map(([route, { n, errors }]) => (
            <div key={route} className="space-y-1">
              <div className="flex justify-between gap-2 text-xs">
                <span className="truncate font-mono">{route}</span>
                <span className="shrink-0 tabular-nums text-muted-foreground">{n}{errors > 0 && <span className="text-red-600 dark:text-red-400"> · {errors} err</span>}</span>
              </div>
              <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div className="bg-primary" style={{ width: `${((n - errors) / maxRoute) * 100}%` }} />
                <div className="bg-red-500" style={{ width: `${(errors / maxRoute) * 100}%` }} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export default function ApiRequestsPage() {
  const { toast } = useToast();
  const [range, setRange] = useState<Range>("24h");
  const [routePath, setRoutePath] = useState("");
  const [method, setMethod] = useState("");
  const [statusCode, setStatusCode] = useState("");
  const [errorCode, setErrorCode] = useState("");
  // Filters only apply on "Search" so typing doesn't fire a request per keystroke.
  const [applied, setApplied] = useState(() => ({ range: "24h" as Range, routePath: "", method: "", statusCode: "", errorCode: "", at: Date.now() }));
  const [expanded, setExpanded] = useState<string | null>(null);

  const filters = useMemo(() => ({
    from: new Date(applied.at - RANGE_MS[applied.range]).toISOString(),
    to: null,
    routePath: applied.routePath.trim() || null,
    method: applied.method || null,
    statusCode: applied.statusCode ? Number(applied.statusCode) : null,
    errorCode: applied.errorCode.trim() || null,
  }), [applied]);

  const query = trpc.apiRequests.list.useInfiniteQuery(
    { ...filters, pageSize: 100 },
    { getNextPageParam: (last) => (last.output.hasMore ? last.output.nextCursor ?? undefined : undefined) },
  );
  const download = trpc.apiRequests.download.useMutation();

  const rows = useMemo(() => (query.data?.pages.flatMap((p) => p.output.apiRequests) ?? []) as ApiRequest[], [query.data]);
  const retention = query.data?.pages[0]?.output.retentionDays;

  const apply = () => setApplied({ range, routePath, method, statusCode, errorCode, at: Date.now() });
  const hasFilters = routePath || method || statusCode || errorCode;

  const handleDownload = async (format: "csv" | "json") => {
    try {
      const res = await download.mutateAsync(filters);
      const list = res.output.apiRequests as ApiRequest[];
      const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
      if (format === "csv") saveFile(`fiber-api-requests-${stamp}.csv`, toCsv(list), "text/csv");
      else saveFile(`fiber-api-requests-${stamp}.json`, JSON.stringify(list, null, 2), "application/json");
      toast({
        title: `Downloaded ${list.length.toLocaleString()} requests`,
        description: res.output.truncated ? "Capped at 5,000 — narrow the time range to get the rest." : undefined,
      });
    } catch (e) {
      toast({ title: "Download failed", description: (e as Error).message, variant: "destructive" });
    }
  };

  return (
    <div className="flex h-full flex-col">
      <Header icon={History} title="API Request Log" description={`Every call your org made${retention ? ` in the last ${retention} days` : ""} — the request side only`}>
        <Button variant="outline" size="sm" disabled={download.isPending} onClick={() => handleDownload("csv")}>
          {download.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}CSV
        </Button>
        <Button variant="outline" size="sm" disabled={download.isPending} onClick={() => handleDownload("json")}>
          <Download className="mr-2 h-4 w-4" />JSON
        </Button>
      </Header>

      <div className="border-b p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium">Time range</Label>
            <ToggleButtonGroup<Range>
              className="h-10"
              value={range}
              onChange={setRange}
              options={[{ value: "1h", label: "1h" }, { value: "24h", label: "24h" }, { value: "7d", label: "7d" }, { value: "14d", label: "14d" }]}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium">Route</Label>
            <Input placeholder="/v1/people-search" value={routePath} onChange={(e) => setRoutePath(e.target.value)} onKeyDown={(e) => e.key === "Enter" && apply()} className="w-56 font-mono text-xs" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium">Method</Label>
            <select value={method} onChange={(e) => setMethod(e.target.value)} className="h-10 rounded-md border bg-background px-2 text-sm">
              <option value="">Any</option>
              {["GET", "POST", "PUT", "PATCH", "DELETE"].map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium">Status</Label>
            <Input placeholder="429" inputMode="numeric" value={statusCode} onChange={(e) => setStatusCode(e.target.value.replace(/\D/g, "").slice(0, 3))} onKeyDown={(e) => e.key === "Enter" && apply()} className="w-20" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium">Error code</Label>
            <Input placeholder="INSUFFICIENT_CREDITS" value={errorCode} onChange={(e) => setErrorCode(e.target.value)} onKeyDown={(e) => e.key === "Enter" && apply()} className="w-52 font-mono text-xs" />
          </div>
          <Button onClick={apply} disabled={query.isFetching && !query.isFetchingNextPage}>
            {query.isFetching && !query.isFetchingNextPage ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
            Search
          </Button>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={() => { setRoutePath(""); setMethod(""); setStatusCode(""); setErrorCode(""); setApplied({ range, routePath: "", method: "", statusCode: "", errorCode: "", at: Date.now() }); }}>
              <X className="mr-1 h-4 w-4" />Clear
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-6xl space-y-6">
          {query.isLoading && <LoadingSkeleton />}
          {query.isError && <ErrorDisplay message={query.error.message} onRetry={() => query.refetch()} />}
          {query.isSuccess && rows.length === 0 && (
            <EmptyState icon={History} title="No requests found" description="Nothing matched these filters in the selected window. History is kept for 14 days." />
          )}
          {rows.length > 0 && (
            <>
              <Summary rows={rows} />
              <div className="overflow-hidden rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs text-muted-foreground">
                    <tr>
                      <th className="w-6" />
                      <th className="px-3 py-2 text-left font-medium">Time</th>
                      <th className="px-3 py-2 text-left font-medium">Request</th>
                      <th className="px-3 py-2 text-left font-medium">Status</th>
                      <th className="px-3 py-2 text-right font-medium">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {rows.map((r) => {
                      const open = expanded === r.id;
                      return (
                        <Fragment key={r.id}>
                          <tr className="cursor-pointer hover:bg-muted/40" onClick={() => setExpanded(open ? null : r.id)}>
                            <td className="pl-3 text-muted-foreground">{open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</td>
                            <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground tabular-nums" suppressHydrationWarning>{fmtTime(r.createdAt)}</td>
                            <td className="px-3 py-2">
                              <span className="mr-2 inline-block w-12 font-mono text-[11px] font-semibold text-muted-foreground">{r.method}</span>
                              <span className="font-mono text-xs">{r.routePath}</span>
                            </td>
                            <td className="px-3 py-2">
                              <span className={cn("inline-flex items-center gap-1.5 font-mono text-xs font-medium", statusText(r.statusCode))}>
                                <span className={cn("h-1.5 w-1.5 rounded-full", statusTone(r.statusCode))} />{r.statusCode}
                              </span>
                              {r.errorCode && <Badge variant="outline" className="ml-2 font-mono text-[10px] font-normal">{r.errorCode}</Badge>}
                            </td>
                            <td className="px-3 py-2 text-right text-xs tabular-nums text-muted-foreground">{fmtMs(r.durationMs)}</td>
                          </tr>
                          {open && (
                            <tr>
                              <td colSpan={5} className="bg-muted/20 px-4 py-3">
                                <p className="mb-2 text-xs text-muted-foreground">Request ID <span className="font-mono">{r.id}</span></p>
                                {r.request != null ? <JsonView value={r.request} /> : <p className="text-xs text-muted-foreground">No request parameters recorded.</p>}
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {query.hasNextPage && (
                <div className="flex justify-center">
                  <Button variant="outline" onClick={() => query.fetchNextPage()} disabled={query.isFetchingNextPage}>
                    {query.isFetchingNextPage && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Load more
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
