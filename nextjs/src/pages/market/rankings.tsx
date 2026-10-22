import { useMemo, useState } from "react";
import { Trophy, Loader2, Download, ArrowUpDown, ExternalLink } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorDisplay } from "@/components/shared/error-display";
import { ToggleButtonGroup } from "@/components/shared/toggle-button-group";
import { cn } from "@/lib/utils";

type List = "fortune-500-usa" | "forbes-global-2000";
interface Co { name: string; rank: number; domain?: string | null; ticker?: string | null; headquarters?: string | null; countryCode?: string | null; revenueUsd?: number | null; profitsUsd?: number | null; marketCapUsd?: number | null; employeeCount?: number | null }
type SortKey = "rank" | "revenueUsd" | "profitsUsd" | "marketCapUsd" | "employeeCount" | "margin";
type Metric = "revenueUsd" | "profitsUsd" | "marketCapUsd" | "employeeCount";

const MAX_RANK: Record<List, number> = { "fortune-500-usa": 500, "forbes-global-2000": 2000 };
const usd = (n?: number | null): string => {
  if (n == null) return "—";
  if (n < 0) return `-${usd(-n)}`;
  return n >= 1e12 ? `$${(n / 1e12).toFixed(2)}T` : n >= 1e9 ? `$${(n / 1e9).toFixed(1)}B` : n >= 1e6 ? `$${(n / 1e6).toFixed(0)}M` : `$${n.toLocaleString()}`;
};
const margin = (c: Co) => (c.revenueUsd && c.profitsUsd != null ? c.profitsUsd / c.revenueUsd : null);
const METRICS: Record<Metric, { label: string; fmt: (n?: number | null) => string }> = {
  revenueUsd: { label: "Revenue", fmt: usd },
  profitsUsd: { label: "Profit", fmt: usd },
  marketCapUsd: { label: "Market cap", fmt: usd },
  employeeCount: { label: "Employees", fmt: (n) => (n == null ? "—" : n.toLocaleString()) },
};

/** Top-N horizontal bars for one metric; negatives (losses) extend left of zero. */
function MetricBars({ companies, metric }: { companies: Co[]; metric: Metric }) {
  const rows = [...companies].filter((c) => c[metric] != null).sort((a, b) => (b[metric] as number) - (a[metric] as number)).slice(0, 15);
  const max = Math.max(1, ...rows.map((c) => Math.abs(c[metric] as number)));
  const hasNeg = rows.some((c) => (c[metric] as number) < 0);
  return (
    <div className="space-y-1.5">
      {rows.map((c) => {
        const v = c[metric] as number;
        const w = (Math.abs(v) / max) * (hasNeg ? 50 : 100);
        return (
          <div key={c.rank} className="grid grid-cols-[11rem_1fr_5rem] items-center gap-2 text-xs">
            <span className="truncate"><span className="mr-1 tabular-nums text-muted-foreground">#{c.rank}</span>{c.name}</span>
            <span className="relative h-3.5">
              <span className={cn("absolute top-0 h-3.5 rounded-sm", v < 0 ? "bg-red-400" : "bg-primary/80")} style={hasNeg ? (v < 0 ? { right: "50%", width: `${w}%` } : { left: "50%", width: `${w}%` }) : { left: 0, width: `${w}%` }} />
            </span>
            <span className="text-right tabular-nums">{METRICS[metric].fmt(v)}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function RankingsPage() {
  const [list, setList] = useState<List>("fortune-500-usa");
  const [year, setYear] = useState("");
  const [low, setLow] = useState(1);
  const [high, setHigh] = useState(50);
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "rank", dir: 1 });
  const [metric, setMetric] = useState<Metric>("revenueUsd");
  const m = trpc.companyRankings.list.useMutation();

  const count = Math.max(0, high - low + 1);
  const companies = useMemo(() => (m.data?.output.companies ?? []) as Co[], [m.data]);
  const sorted = useMemo(() => {
    const val = (c: Co) => (sort.key === "margin" ? margin(c) : (c[sort.key] as number | null | undefined)) ?? -Infinity;
    return [...companies].sort((a, b) => (val(a) - val(b)) * sort.dir);
  }, [companies, sort]);

  const totals = useMemo(() => ({
    revenue: companies.reduce((n, c) => n + (c.revenueUsd ?? 0), 0),
    profit: companies.reduce((n, c) => n + (c.profitsUsd ?? 0), 0),
    employees: companies.reduce((n, c) => n + (c.employeeCount ?? 0), 0),
  }), [companies]);

  const th = (key: SortKey, label: string, right = true) => (
    <th className={cn("px-3 py-2 font-medium", right ? "text-right" : "text-left")}>
      <button type="button" className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : key === "rank" ? 1 : -1 }))}>
        {label}<ArrowUpDown className={cn("h-3 w-3", sort.key === key ? "opacity-100" : "opacity-30")} />
      </button>
    </th>
  );

  const downloadCsv = () => {
    const cols = ["rank", "name", "domain", "ticker", "headquarters", "countryCode", "revenueUsd", "profitsUsd", "marketCapUsd", "employeeCount"] as const;
    const csv = [cols.join(","), ...sorted.map((c) => cols.map((k) => { const v = c[k]; const s = v == null ? "" : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }).join(","))].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = `${m.data?.output.list}-${m.data?.output.year}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-full flex-col">
      <Header icon={Trophy} title="Company Rankings" description="Download Fortune 500 or Forbes Global 2000 editions with financials and headcount" />
      <div className="border-b p-4">
        <form className="flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); if (count > 0) m.mutate({ list, year: year ? Number(year) : null, low, high }); }}>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium">List</Label>
            <ToggleButtonGroup<List> value={list} onChange={(v) => { setList(v); setHigh((h) => Math.min(h, MAX_RANK[v])); }} options={[{ value: "fortune-500-usa", label: "Fortune 500" }, { value: "forbes-global-2000", label: "Forbes Global 2000" }]} />
          </div>
          <div className="flex flex-col gap-1.5"><Label className="text-xs font-medium">Year</Label><Input type="number" placeholder="Latest" value={year} onChange={(e) => setYear(e.target.value)} className="w-24" /></div>
          <div className="flex flex-col gap-1.5"><Label className="text-xs font-medium">From rank</Label><Input type="number" min={1} max={MAX_RANK[list]} value={low} onChange={(e) => setLow(Math.max(1, Number(e.target.value) || 1))} className="w-24" /></div>
          <div className="flex flex-col gap-1.5"><Label className="text-xs font-medium">To rank</Label><Input type="number" min={1} max={MAX_RANK[list]} value={high} onChange={(e) => setHigh(Math.min(MAX_RANK[list], Math.max(1, Number(e.target.value) || 1)))} className="w-24" /></div>
          <Button type="submit" disabled={m.isPending || count === 0}>
            {m.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trophy className="mr-2 h-4 w-4" />}Get {count} companies · {count} cr
          </Button>
        </form>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-6xl space-y-6">
          {m.isError && <ErrorDisplay message={m.error.message} />}
          {!m.data && !m.isPending && !m.isError && <EmptyState icon={Trophy} title="Pick a list and rank range" description="You pay 1 credit per company returned, so start with a small range like the top 50." />}
          {companies.length > 0 && (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <Card><CardContent className="pt-5"><p className="text-xs text-muted-foreground">Combined revenue</p><p className="text-2xl font-semibold tabular-nums">{usd(totals.revenue)}</p></CardContent></Card>
                <Card><CardContent className="pt-5"><p className="text-xs text-muted-foreground">Combined profit</p><p className="text-2xl font-semibold tabular-nums">{usd(totals.profit)}</p></CardContent></Card>
                <Card><CardContent className="pt-5"><p className="text-xs text-muted-foreground">Combined employees</p><p className="text-2xl font-semibold tabular-nums">{totals.employees.toLocaleString()}</p></CardContent></Card>
              </div>
              <Card>
                <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-sm">Top 15 by {METRICS[metric].label.toLowerCase()}</CardTitle>
                  <ToggleButtonGroup<Metric> value={metric} onChange={setMetric} options={(Object.keys(METRICS) as Metric[]).map((k) => ({ value: k, label: METRICS[k].label }))} />
                </CardHeader>
                <CardContent><MetricBars companies={companies} metric={metric} /></CardContent>
              </Card>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{m.data!.output.list === "fortune-500-usa" ? "Fortune 500" : "Forbes Global 2000"} · {m.data!.output.year} edition · {companies.length} companies</p>
                <Button variant="outline" size="sm" onClick={downloadCsv}><Download className="mr-1.5 h-3.5 w-3.5" />CSV</Button>
              </div>
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs text-muted-foreground">
                    <tr>
                      {th("rank", "#", false)}
                      <th className="px-3 py-2 text-left font-medium">Company</th>
                      <th className="px-3 py-2 text-left font-medium">HQ</th>
                      {th("revenueUsd", "Revenue")}
                      {th("profitsUsd", "Profit")}
                      {th("margin", "Margin")}
                      {th("marketCapUsd", "Market cap")}
                      {th("employeeCount", "Employees")}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {sorted.map((c) => {
                      const mg = margin(c);
                      return (
                        <tr key={c.rank} className="hover:bg-muted/30">
                          <td className="px-3 py-2 tabular-nums text-muted-foreground">{c.rank}</td>
                          <td className="px-3 py-2">
                            <span className="font-medium">{c.name}</span>
                            {c.ticker && <span className="ml-1.5 font-mono text-[11px] text-muted-foreground">{c.ticker}</span>}
                            {c.domain && <a href={`https://${c.domain}`} target="_blank" rel="noreferrer" className="ml-1.5 inline-flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground">{c.domain}<ExternalLink className="h-2.5 w-2.5" /></a>}
                          </td>
                          <td className="px-3 py-2 text-xs text-muted-foreground">{[c.headquarters, c.countryCode].filter(Boolean).join(", ")}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{usd(c.revenueUsd)}</td>
                          <td className={cn("px-3 py-2 text-right tabular-nums", (c.profitsUsd ?? 0) < 0 && "text-red-600 dark:text-red-400")}>{usd(c.profitsUsd)}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{mg == null ? "—" : `${(mg * 100).toFixed(1)}%`}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{usd(c.marketCapUsd)}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{c.employeeCount?.toLocaleString() ?? "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
