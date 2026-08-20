import { useState } from "react";
import { ArrowRightLeft, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ErrorDisplay } from "@/components/shared/error-display";
import { EmptyState } from "@/components/shared/empty-state";

type Row = Record<string, unknown>;
type Identifier = "linkedinUrl" | "linkedinSlug" | "linkedinOrgId" | "domain";

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
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {rows.slice(0, 10).map((r, i) => {
          const count = typeof r.count === "number" ? r.count : 0;
          const percent = typeof r.percent === "number" ? r.percent : 0;
          const label = labelKeys.map((k) => (typeof r[k] === "string" ? (r[k] as string) : undefined)).find(Boolean) ?? "—";
          return (
            <div key={i} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-medium">{label}</span>
                <span className="text-muted-foreground">{count.toLocaleString()} ({percent.toFixed(1)}%)</span>
              </div>
              <div className="h-2 w-full rounded bg-muted">
                <div className="h-2 rounded bg-primary" style={{ width: `${(count / max) * 100}%` }} />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export default function TalentFlowPage() {
  const [company, setCompany] = useState("");
  const [direction, setDirection] = useState<"joiners" | "leavers">("joiners");
  const [after, setAfter] = useState("");
  const [before, setBefore] = useState("");

  const mutation = trpc.tools.getTalentFlow.useMutation();

  const handleSubmit = () => {
    const v = company.trim();
    if (!v) return;
    mutation.mutate({
      identifier: detectIdentifier(v),
      value: v,
      direction,
      after: after || null,
      before: before || null,
    });
  };

  const out = mutation.data?.output as Row | undefined;
  const companyInfo = out?.company as Row | undefined;
  const buckets = (out?.companyBuckets ?? []) as Row[];
  const breakdowns = (out?.breakdowns ?? {}) as Row;
  const peopleCount = typeof out?.peopleCount === "number" ? (out.peopleCount as number) : null;

  return (
    <div className="flex h-full flex-col">
      <Header icon={ArrowRightLeft} title="Talent Flow" description="See where a company's joiners come from — or where its leavers go" />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-3xl space-y-6">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label>Company</Label>
                <Input
                  placeholder="e.g. stripe.com, LinkedIn company URL, slug, or org ID"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
                />
              </div>
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Direction</Label>
                  <select
                    value={direction}
                    onChange={(e) => setDirection(e.target.value as "joiners" | "leavers")}
                    className="block rounded-md border bg-background px-2 py-1.5 text-sm"
                  >
                    <option value="joiners">Joiners — where new hires come from</option>
                    <option value="leavers">Leavers — where departures go</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">After (optional)</Label>
                  <Input type="date" value={after} onChange={(e) => setAfter(e.target.value)} className="w-40" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Before (optional)</Label>
                  <Input type="date" value={before} onChange={(e) => setBefore(e.target.value)} className="w-40" />
                </div>
              </div>
              <Button onClick={handleSubmit} disabled={!company.trim() || mutation.isPending}>
                {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRightLeft className="mr-2 h-4 w-4" />}
                Analyze
              </Button>
              {mutation.isPending && (
                <p className="text-xs text-muted-foreground">Analyzing employment transitions — this can take a minute...</p>
              )}
            </CardContent>
          </Card>

          {mutation.isError && <ErrorDisplay message={mutation.error.message} />}

          {out && (
            <div className="space-y-4">
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">
                    {direction === "joiners" ? "People who joined" : "People who left"} {(companyInfo?.name as string) ?? company}
                  </p>
                  {peopleCount != null && <p className="text-3xl font-semibold">{peopleCount.toLocaleString()}</p>}
                </CardContent>
              </Card>

              {buckets.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      {direction === "joiners" ? "Top source companies" : "Top destination companies"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {buckets.slice(0, 15).map((b, i) => {
                      const count = typeof b.count === "number" ? (b.count as number) : 0;
                      const percent = typeof b.percent === "number" ? (b.percent as number) : 0;
                      const max = Math.max(1, ...buckets.map((x) => (typeof x.count === "number" ? (x.count as number) : 0)));
                      return (
                        <div key={i} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="flex items-center gap-2 font-medium">
                              {b.linkedinUrl ? (
                                <a href={b.linkedinUrl as string} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                  {b.companyName as string}
                                </a>
                              ) : (
                                (b.companyName as string)
                              )}
                              {(b.stage as string) && <Badge variant="outline" className="text-[10px]">{b.stage as string}</Badge>}
                            </span>
                            <span className="text-muted-foreground">{count.toLocaleString()} ({percent.toFixed(1)}%)</span>
                          </div>
                          <div className="h-2 w-full rounded bg-muted">
                            <div className="h-2 rounded bg-primary" style={{ width: `${(count / max) * 100}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <BreakdownCard title="By seniority" rows={(breakdowns.bySeniority ?? []) as Row[]} labelKeys={["seniority"]} />
                <BreakdownCard title="By job function" rows={(breakdowns.byJobFunction ?? []) as Row[]} labelKeys={["jobFunction"]} />
                <BreakdownCard title="By country" rows={(breakdowns.byCountry ?? []) as Row[]} labelKeys={["countryName"]} />
                <BreakdownCard title="By school" rows={(breakdowns.bySchool ?? []) as Row[]} labelKeys={["school"]} />
              </div>

              {(out.markdownSummary as string) && (
                <Card>
                  <CardHeader><CardTitle className="text-base">Summary</CardTitle></CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{out.markdownSummary as string}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {!mutation.data && !mutation.isPending && !mutation.isError && (
            <EmptyState icon={ArrowRightLeft} title="Track talent movement" description="Enter a company to analyze where its talent comes from and goes." />
          )}
        </div>
      </div>
    </div>
  );
}
