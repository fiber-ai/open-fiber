import { useState } from "react";
import { BarChart3, Loader2, Search } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PollingIndicator } from "@/components/shared/polling-indicator";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorDisplay } from "@/components/shared/error-display";

type Row = Record<string, unknown>;
type Identifier = "linkedinUrl" | "linkedinSlug" | "linkedinOrgId" | "domain";

function detectIdentifier(v: string): Identifier {
  if (v.includes("linkedin.com")) return "linkedinUrl";
  if (/^\d+$/.test(v)) return "linkedinOrgId";
  if (v.includes(".")) return "domain";
  return "linkedinSlug";
}

function BarList({ title, rows, labelKey }: { title: string; rows: Row[]; labelKey: string }) {
  const counts = rows.map((r) => (typeof r.totalEmployees === "number" ? r.totalEmployees : 0));
  const max = Math.max(1, ...counts);
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {rows.map((r, i) => {
          const count = typeof r.totalEmployees === "number" ? r.totalEmployees : 0;
          const label = [labelKey, "seniority", "seniorityLevel", "level", "name", "function"]
            .map((k) => (typeof r[k] === "string" ? (r[k] as string) : undefined))
            .find(Boolean) ?? "—";
          return (
            <div key={i} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-medium">{label}</span>
                <span className="text-muted-foreground">{count.toLocaleString()}</span>
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

export default function DepthChartPage() {
  const [value, setValue] = useState("");
  const [reportId, setReportId] = useState<string | null>(null);

  const start = trpc.depthChart.start.useMutation({
    onSuccess: (data) => { if (data?.output?.reportId) setReportId(data.output.reportId); },
  });

  const poll = trpc.depthChart.poll.useQuery(
    { reportId: reportId! },
    {
      enabled: !!reportId,
      refetchInterval: (q) => {
        const s = q.state.data?.output?.status;
        return s === "completed" || s === "failed" ? false : 4000;
      },
    }
  );

  const handleSubmit = () => {
    const v = value.trim();
    if (!v) return;
    setReportId(null);
    start.mutate({ identifier: detectIdentifier(v), value: v });
  };

  const out = poll.data?.output as Row | undefined;
  const status = out?.status as string | undefined;
  // Completed data is nested under `output.report`.
  const report = (out?.report ?? out) as Row | undefined;
  const isRunning = start.isPending || (!!reportId && status !== "completed" && status !== "failed");
  const functionStats = (report?.functionStats ?? []) as Row[];
  const seniorityStats = (report?.seniorityStats ?? []) as Row[];
  const totalEmployees = typeof report?.totalEmployees === "number" ? (report.totalEmployees as number) : null;
  // v0.0.48: totalEmployees is now official headcount; classifiedEmployees is what the buckets sum to.
  const classifiedEmployees = typeof report?.classifiedEmployees === "number" ? (report.classifiedEmployees as number) : null;
  const categorizationNote = typeof report?.categorizationNote === "string" ? (report.categorizationNote as string) : null;

  return (
    <div className="flex h-full flex-col">
      <Header icon={BarChart3} title="Depth Chart" description="Break down a company's headcount by function and seniority" />

      <div className="border-b p-4">
        <div className="flex gap-3 items-end">
          <div className="flex-1 max-w-lg space-y-1.5">
            <Label className="text-xs font-medium">Company (domain, LinkedIn URL, slug, or org ID)</Label>
            <Input placeholder="e.g. anthropic.com or anthropic" value={value} onChange={(e) => setValue(e.target.value)} />
          </div>
          <Button onClick={handleSubmit} disabled={!value.trim() || isRunning}>
            {isRunning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
            Generate
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {start.isError && <ErrorDisplay message={start.error.message} />}
        {poll.isError && !isRunning && <ErrorDisplay message={poll.error.message} />}
        {isRunning && !start.isError && <PollingIndicator message="Building depth chart (this can take a minute)..." />}
        {status === "failed" && <ErrorDisplay message="Depth chart generation failed. Please try again." />}

        {status === "completed" && (
          <div className="mx-auto max-w-3xl space-y-4">
            {totalEmployees != null && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex gap-8">
                    <div>
                      <p className="text-sm text-muted-foreground">Total employees</p>
                      <p className="text-3xl font-semibold">{totalEmployees.toLocaleString()}</p>
                    </div>
                    {classifiedEmployees != null && classifiedEmployees !== totalEmployees && (
                      <div>
                        <p className="text-sm text-muted-foreground">Categorized</p>
                        <p className="text-3xl font-semibold">{classifiedEmployees.toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                  {categorizationNote && <p className="mt-2 text-xs text-muted-foreground">{categorizationNote}</p>}
                </CardContent>
              </Card>
            )}
            {functionStats.length > 0 && <BarList title="By function" rows={functionStats} labelKey="function" />}
            {seniorityStats.length > 0 && <BarList title="By seniority" rows={seniorityStats} labelKey="seniority" />}
            {functionStats.length === 0 && seniorityStats.length === 0 && (
              <EmptyState icon={BarChart3} title="No breakdown available" description="The report completed but returned no department data." />
            )}
          </div>
        )}

        {!reportId && !start.isPending && !start.isError && (
          <EmptyState icon={BarChart3} title="Company depth chart" description="Enter a company to see its employee breakdown by function and seniority." />
        )}
      </div>
    </div>
  );
}
