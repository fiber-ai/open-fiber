import { useState } from "react";
import { ArrowRightLeft, Loader2, Swords, Waypoints } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorDisplay } from "@/components/shared/error-display";
import { EmptyState } from "@/components/shared/empty-state";
import { ToggleButtonGroup } from "@/components/shared/toggle-button-group";
import { Markdown } from "@/components/shared/markdown";
import { FlowDiagram, BoxPlot, RivalsButterfly } from "@/components/talent-flow/charts";

type Row = Record<string, unknown>;
type Identifier = "linkedinUrl" | "linkedinSlug" | "linkedinOrgId" | "domain";
type Mode = "flow" | "rivals";

function detectIdentifier(v: string): Identifier {
  if (v.includes("linkedin.com")) return "linkedinUrl";
  if (/^\d+$/.test(v)) return "linkedinOrgId";
  if (v.includes(".")) return "domain";
  return "linkedinSlug";
}

function BreakdownCard({ title, rows, labelKeys }: { title: string; rows: Row[]; labelKeys: string[] }) {
  if (rows.length === 0) return null;
  const max = Math.max(1, ...rows.map((r) => (typeof r.count === "number" ? r.count : 0)));
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {rows.slice(0, 8).map((r, i) => {
          const count = typeof r.count === "number" ? r.count : 0;
          const percent = typeof r.percent === "number" ? r.percent : 0;
          const label = [...labelKeys, "label", "name"].map((k) => (typeof r[k] === "string" ? (r[k] as string) : undefined)).find(Boolean) ?? "—";
          return (
            <div key={i} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-medium">{label}</span>
                <span className="tabular-nums text-muted-foreground">{count.toLocaleString()} ({percent.toFixed(1)}%)</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted"><div className="h-1.5 rounded-full bg-primary" style={{ width: `${(count / max) * 100}%` }} /></div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function SummaryCard({ md }: { md?: unknown }) {
  if (typeof md !== "string" || !md.trim()) return null;
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">Summary</CardTitle></CardHeader>
      <CardContent><Markdown>{md}</Markdown></CardContent>
    </Card>
  );
}

function FlowResults({ out, direction, fallbackName }: { out: Row; direction: "joiners" | "leavers"; fallbackName: string }) {
  const company = out.company as Row | undefined;
  const name = (company?.name as string) ?? fallbackName;
  const buckets = (out.companyBuckets ?? []) as Row[];
  const b = (out.breakdowns ?? {}) as Row;
  const peopleCount = typeof out.peopleCount === "number" ? out.peopleCount : 0;
  const win = out.window as { after?: string | null; before?: string | null } | undefined;
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-sm">
            {peopleCount.toLocaleString()} people {direction === "joiners" ? `joined ${name}` : `left ${name}`}
            {(win?.after || win?.before) && <span className="font-normal text-muted-foreground"> · {win?.after ?? "…"} → {win?.before ?? "now"}</span>}
          </CardTitle>
          <p className="text-xs text-muted-foreground">{direction === "joiners" ? "Where they came from" : "Where they went"}. Hover a company to trace its flow.</p>
        </CardHeader>
        <CardContent><FlowDiagram companyName={name} buckets={buckets} direction={direction} total={peopleCount} /></CardContent>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        <Card><CardContent className="pt-5"><BoxPlot label="Years of experience" d={out.yearsOfExperience as never} unit="yrs" /></CardContent></Card>
        <Card><CardContent className="pt-5"><BoxPlot label={direction === "joiners" ? "Tenure at previous company" : `Tenure at ${name}`} d={out.tenureMonths as never} unit="mo" fmt={(v) => Math.round(v).toString()} /></CardContent></Card>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <BreakdownCard title="By seniority" rows={(b.bySeniority ?? []) as Row[]} labelKeys={["seniority"]} />
        <BreakdownCard title="By job function" rows={(b.byJobFunction ?? []) as Row[]} labelKeys={["jobFunction"]} />
        <BreakdownCard title="By experience" rows={(b.byYearsOfExperience ?? []) as Row[]} labelKeys={["label"]} />
        <BreakdownCard title="By metro" rows={(b.byMetro ?? []) as Row[]} labelKeys={["name"]} />
        <BreakdownCard title="By country" rows={(b.byCountry ?? []) as Row[]} labelKeys={["countryName"]} />
        <BreakdownCard title="By school" rows={(b.bySchool ?? []) as Row[]} labelKeys={["school"]} />
      </div>
      <SummaryCard md={out.markdownSummary} />
    </div>
  );
}

function RivalsResults({ out, fallbackName }: { out: Row; fallbackName: string }) {
  const name = ((out.company as Row | undefined)?.name as string) ?? fallbackName;
  const joiners = (out.joinersCount as number) ?? 0, leavers = (out.leaversCount as number) ?? 0;
  const net = joiners - leavers;
  const rivals = [...((out.rivals ?? []) as Row[])].sort((a, b) => ((b.totalMovesCount as number) ?? 0) - ((a.totalMovesCount as number) ?? 0));
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="pt-5"><p className="text-xs text-muted-foreground">Joined {name}</p><p className="text-2xl font-semibold tabular-nums text-success">{joiners.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="pt-5"><p className="text-xs text-muted-foreground">Left {name}</p><p className="text-2xl font-semibold tabular-nums text-destructive">{leavers.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="pt-5"><p className="text-xs text-muted-foreground">Net talent</p><p className="text-2xl font-semibold tabular-nums">{net > 0 ? "+" : ""}{net.toLocaleString()}</p></CardContent></Card>
      </div>
      {rivals.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Head-to-head with talent rivals</CardTitle></CardHeader>
          <CardContent><RivalsButterfly rivals={rivals} /></CardContent>
        </Card>
      )}
      <SummaryCard md={out.markdownSummary} />
    </div>
  );
}

export default function TalentFlowPage() {
  const [mode, setMode] = useState<Mode>("flow");
  const [company, setCompany] = useState("");
  const [direction, setDirection] = useState<"joiners" | "leavers">("joiners");
  const [after, setAfter] = useState("");
  const [before, setBefore] = useState("");
  const [perSide, setPerSide] = useState(10);

  const flow = trpc.tools.getTalentFlow.useMutation();
  const rivals = trpc.tools.getTalentFlowRivals.useMutation();
  const active = mode === "flow" ? flow : rivals;

  const handleSubmit = () => {
    const v = company.trim();
    if (!v) return;
    const base = { identifier: detectIdentifier(v), value: v, after: after || null, before: before || null };
    if (mode === "flow") flow.mutate({ ...base, direction });
    else rivals.mutate({ ...base, numCompaniesPerSide: perSide });
  };

  // Headings describe the run that produced the data, not the live toggle.
  const resultDirection = flow.variables?.direction ?? direction;

  return (
    <div className="flex h-full flex-col">
      <Header icon={ArrowRightLeft} title="Talent Flow" description="Where a company hires from, where its people go, and who it trades talent with">
        <ToggleButtonGroup<Mode> value={mode} onChange={setMode} options={[{ value: "flow", label: "Joiners / leavers", icon: Waypoints }, { value: "rivals", label: "Rivals", icon: Swords }]} />
      </Header>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-5xl space-y-6">
          <Card>
            <CardContent className="space-y-4 pt-6">
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex min-w-[18rem] flex-1 flex-col gap-1.5">
                  <Label htmlFor="talent-flow-company" className="text-xs font-medium">Company</Label>
                  <Input id="talent-flow-company" placeholder="stripe.com, LinkedIn company URL, slug, or org ID" value={company} onChange={(e) => setCompany(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }} />
                </div>
                {mode === "flow" ? (
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-medium">Direction</Label>
                    <ToggleButtonGroup className="h-10" options={[{ value: "joiners", label: "Joiners" }, { value: "leavers", label: "Leavers" }]} value={direction} onChange={(v) => setDirection(v as "joiners" | "leavers")} />
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="talent-flow-rivals-per-side" className="text-xs font-medium">Rivals per side</Label>
                    <Input id="talent-flow-rivals-per-side" type="number" min={1} max={50} value={perSide} onChange={(e) => setPerSide(Math.min(50, Math.max(1, Number(e.target.value) || 10)))} className="w-24" />
                  </div>
                )}
                <div className="flex flex-col gap-1.5"><Label htmlFor="talent-flow-after-optional" className="text-xs font-medium">After (optional)</Label><Input id="talent-flow-after-optional" type="date" value={after} onChange={(e) => setAfter(e.target.value)} className="w-40" /></div>
                <div className="flex flex-col gap-1.5"><Label htmlFor="talent-flow-before-optional" className="text-xs font-medium">Before (optional)</Label><Input id="talent-flow-before-optional" type="date" value={before} onChange={(e) => setBefore(e.target.value)} className="w-40" /></div>
                <Button onClick={handleSubmit} disabled={!company.trim() || active.isPending}>
                  {active.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRightLeft className="mr-2 h-4 w-4" />}Analyze · 5 cr
                </Button>
              </div>
              {active.isPending && (
                <p className="text-xs text-muted-foreground">
                  Analyzing up to 10,000 career moves{mode === "rivals" ? " in both directions. Big companies can take up to four minutes." : ". Big companies can take up to two minutes."}
                </p>
              )}
            </CardContent>
          </Card>

          {active.isError && <ErrorDisplay message={active.error.message} />}
          {mode === "flow" && flow.data && <FlowResults out={flow.data.output as Row} direction={resultDirection} fallbackName={company} />}
          {mode === "rivals" && rivals.data && <RivalsResults out={rivals.data.output as Row} fallbackName={company} />}
          {!active.data && !active.isPending && !active.isError && (
            <EmptyState
              icon={mode === "flow" ? ArrowRightLeft : Swords}
              title={mode === "flow" ? "Track talent movement" : "Find talent rivals"}
              description={mode === "flow" ? "See where a company's new hires come from, or where its alumni end up." : "See which companies a firm wins talent from and loses talent to, head to head."}
            />
          )}
        </div>
      </div>
    </div>
  );
}
