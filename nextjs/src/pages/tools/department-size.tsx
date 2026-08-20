import { useState } from "react";
import { PieChart, Loader2, Plus, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorDisplay } from "@/components/shared/error-display";
import { EmptyState } from "@/components/shared/empty-state";

type Identifier = "linkedinUrl" | "linkedinSlug" | "linkedinOrgId" | "domain";

function detectIdentifier(v: string): Identifier {
  if (v.includes("linkedin.com")) return "linkedinUrl";
  if (/^\d+$/.test(v)) return "linkedinOrgId";
  if (v.includes(".")) return "domain";
  return "linkedinSlug";
}

interface DeptRow {
  name: string;
  includeTitles: string;
  excludeTitles: string;
}

const DEFAULT_DEPARTMENTS: DeptRow[] = [
  { name: "Engineering", includeTitles: "engineer, developer, swe", excludeTitles: "" },
  { name: "Sales", includeTitles: "sales, account executive, sdr, bdr", excludeTitles: "" },
];

function parseTitles(s: string): string[] {
  return s.split(",").map((t) => t.trim()).filter(Boolean);
}

export default function DepartmentSizePage() {
  const [company, setCompany] = useState("");
  const [departments, setDepartments] = useState<DeptRow[]>(DEFAULT_DEPARTMENTS);

  const mutation = trpc.tools.getDepartmentSize.useMutation();

  const validDepartments = departments.filter((d) => d.name.trim() && parseTitles(d.includeTitles).length > 0);

  const handleSubmit = () => {
    const v = company.trim();
    if (!v || validDepartments.length === 0) return;
    mutation.mutate({
      identifier: detectIdentifier(v),
      value: v,
      departments: validDepartments.map((d) => ({
        name: d.name.trim(),
        includeTitles: parseTitles(d.includeTitles),
        excludeTitles: parseTitles(d.excludeTitles),
      })),
    });
  };

  const updateDept = (i: number, patch: Partial<DeptRow>) => {
    setDepartments((prev) => prev.map((d, j) => (j === i ? { ...d, ...patch } : d)));
  };

  const out = mutation.data?.output;
  const companyInfo = out?.company as Record<string, unknown> | undefined;
  const maxCount = Math.max(1, ...(out?.departments ?? []).map((d) => d.count));

  return (
    <div className="flex h-full flex-col">
      <Header icon={PieChart} title="Department Size" description="Count employees in departments you define by job title" />

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
                />
              </div>

              <div className="space-y-3">
                <Label>Departments</Label>
                {departments.map((d, i) => (
                  <div key={i} className="rounded-md border p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        className="max-w-[200px]"
                        placeholder="Department name"
                        value={d.name}
                        onChange={(e) => updateDept(i, { name: e.target.value })}
                      />
                      <Button
                        variant="ghost" size="icon" className="ml-auto h-8 w-8 shrink-0"
                        onClick={() => setDepartments((prev) => prev.filter((_, j) => j !== i))}
                        disabled={departments.length === 1}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <Input
                      placeholder="Include titles (comma-separated), e.g. engineer, developer"
                      value={d.includeTitles}
                      onChange={(e) => updateDept(i, { includeTitles: e.target.value })}
                    />
                    <Input
                      placeholder="Exclude titles (optional, comma-separated)"
                      value={d.excludeTitles}
                      onChange={(e) => updateDept(i, { excludeTitles: e.target.value })}
                    />
                  </div>
                ))}
                <Button
                  variant="outline" size="sm"
                  onClick={() => setDepartments((prev) => [...prev, { name: "", includeTitles: "", excludeTitles: "" }])}
                >
                  <Plus className="mr-2 h-4 w-4" /> Add department
                </Button>
                <p className="text-xs text-muted-foreground">
                  Departments are counted independently against all current employees — overlapping titles can count the same person twice.
                </p>
              </div>

              <Button onClick={handleSubmit} disabled={!company.trim() || validDepartments.length === 0 || mutation.isPending}>
                {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PieChart className="mr-2 h-4 w-4" />}
                Count Departments
              </Button>
            </CardContent>
          </Card>

          {mutation.isError && <ErrorDisplay message={mutation.error.message} />}

          {out && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {(companyInfo?.name as string) ?? company} — {out.headcount.toLocaleString()} employees
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {out.departments.map((d, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{d.name}</span>
                      <span className="text-muted-foreground">
                        {d.count.toLocaleString()} ({d.percentOfHeadcount.toFixed(1)}% of headcount)
                      </span>
                    </div>
                    <div className="h-2 w-full rounded bg-muted">
                      <div className="h-2 rounded bg-primary" style={{ width: `${(d.count / maxCount) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {!mutation.data && !mutation.isPending && !mutation.isError && (
            <EmptyState icon={PieChart} title="Size up departments" description="Define departments by job titles and see how many employees match at any company." />
          )}
        </div>
      </div>
    </div>
  );
}
