import { useState } from "react";
import { FileSearch, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorDisplay } from "@/components/shared/error-display";
import { FiberAvatar } from "@/components/shared/fiber-avatar";

/**
 * Auto-detect the identifier type from user input.
 * The API accepts: linkedinUrl, linkedinSlug, linkedinOrgId, or domain.
 */
function detectIdentifier(input: string): { identifier: "linkedinUrl" | "linkedinSlug" | "linkedinOrgId" | "domain"; value: string } {
  const trimmed = input.trim();
  if (trimmed.includes("linkedin.com/company/")) {
    return { identifier: "linkedinUrl", value: trimmed };
  }
  if (/^\d+$/.test(trimmed)) {
    return { identifier: "linkedinOrgId", value: trimmed };
  }
  if (trimmed.includes(".")) {
    return { identifier: "domain", value: trimmed };
  }
  // Assume LinkedIn slug if no dots and not a number
  return { identifier: "linkedinSlug", value: trimmed };
}

export default function ScoutingReportPage() {
  const [value, setValue] = useState("");

  const mutation = trpc.tools.getScoutingReport.useMutation();

  const handleSubmit = () => {
    if (!value.trim()) return;
    const { identifier, value: val } = detectIdentifier(value);
    mutation.mutate({ identifier, value: val });
  };

  const report = mutation.data?.output as Record<string, unknown> | undefined;
  const reportData = report?.report as Record<string, unknown> | undefined;
  const profile = reportData?.companyProfile as Record<string, unknown> | undefined;

  return (
    <div className="flex h-full flex-col">
      <Header title="Scouting Report" description="AI-generated company research (may take 1-2 minutes)" />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-2xl space-y-6">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label>Company</Label>
                <Input
                  placeholder="e.g. stripe.com, https://linkedin.com/company/stripe, or stripe"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
                />
                <p className="text-xs text-muted-foreground">
                  Enter a domain, LinkedIn company URL, LinkedIn slug, or org ID. Auto-detected.
                </p>
              </div>
              <Button onClick={handleSubmit} disabled={!value.trim() || mutation.isPending}>
                {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSearch className="mr-2 h-4 w-4" />}
                Generate Report
              </Button>
              {mutation.isPending && (
                <p className="text-xs text-muted-foreground">This may take 1-2 minutes as the AI gathers data from multiple sources...</p>
              )}
            </CardContent>
          </Card>

          {mutation.isError && <ErrorDisplay message={mutation.error.message} />}

          {reportData && (
            <div className="space-y-4">
              {/* Company header */}
              {profile && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <FiberAvatar src={profile.logoUrl as string} alt={profile.name as string} type="company" size="lg" />
                      <div>
                        <h2 className="text-lg font-semibold">{(profile.name as string) ?? "Unknown"}</h2>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {(profile.website as string) && (
                            <a href={profile.website as string} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                              {(profile.website as string).replace(/^https?:\/\//, "")}
                            </a>
                          )}
                          {(profile.employeeCount as number) != null && (
                            <Badge variant="outline" className="text-xs">{(profile.employeeCount as number).toLocaleString()} employees</Badge>
                          )}
                          {((profile.industries as string[])?.length ?? 0) > 0 && (
                            <Badge variant="outline" className="text-xs">{(profile.industries as string[])[0]}</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Summary */}
              {(reportData.companySummary as string) && (
                <Card>
                  <CardHeader><CardTitle className="text-base">Summary</CardTitle></CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{reportData.companySummary as string}</p>
                  </CardContent>
                </Card>
              )}

              {/* Funding */}
              {(reportData.fundingInfo as Record<string, unknown>) && (
                <Card>
                  <CardHeader><CardTitle className="text-base">Funding</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {(() => {
                      const f = reportData.fundingInfo as Record<string, unknown>;
                      return (
                        <>
                          <div className="flex flex-wrap gap-2">
                            {(f.stage as string) && <Badge>{f.stage as string}</Badge>}
                            {(f.totalFundingUsd as number) != null && <Badge variant="outline">${((f.totalFundingUsd as number) / 1e6).toFixed(1)}M total</Badge>}
                            {(f.lastRoundDate as string) && <Badge variant="outline">Last: {f.lastRoundDate as string}</Badge>}
                          </div>
                          {((f.investors as string[])?.length ?? 0) > 0 && (
                            <p className="text-sm text-muted-foreground">Investors: {(f.investors as string[]).join(", ")}</p>
                          )}
                          {(f.description as string) && <p className="text-xs text-muted-foreground">{f.description as string}</p>}
                        </>
                      );
                    })()}
                  </CardContent>
                </Card>
              )}

              {/* Founders */}
              {((reportData.founders as Array<Record<string, unknown>>)?.length ?? 0) > 0 && (
                <Card>
                  <CardHeader><CardTitle className="text-base">Founders & Leadership</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {(reportData.founders as Array<Record<string, unknown>>).map((f, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <FiberAvatar src={f.profilePicUrl as string} alt={f.name as string} type="person" size="sm" />
                        <div>
                          <span className="text-sm font-medium">{f.name as string}</span>
                          {(f.role as string) && <span className="text-xs text-muted-foreground ml-2">{f.role as string}</span>}
                        </div>
                        {(f.linkedinUrl as string) && (
                          <a href={f.linkedinUrl as string} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline ml-auto">LinkedIn</a>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* News */}
              {((reportData.news as Array<Record<string, unknown>>)?.length ?? 0) > 0 && (
                <Card>
                  <CardHeader><CardTitle className="text-base">Recent News</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {(reportData.news as Array<Record<string, unknown>>).map((n, i) => (
                      <div key={i} className="border-b pb-2 last:border-0 last:pb-0">
                        <a href={n.url as string} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-primary hover:underline">
                          {n.title as string}
                        </a>
                        {(n.date as string) && <span className="text-xs text-muted-foreground ml-2">{n.date as string}</span>}
                        {(n.summary as string) && <p className="text-xs text-muted-foreground mt-0.5">{n.summary as string}</p>}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Milestones */}
              {((reportData.milestones as Array<Record<string, unknown>>)?.length ?? 0) > 0 && (
                <Card>
                  <CardHeader><CardTitle className="text-base">Milestones</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {(reportData.milestones as Array<Record<string, unknown>>).slice(0, 10).map((m, i) => (
                      <div key={i} className="flex gap-3 text-sm">
                        <span className="text-xs text-muted-foreground font-mono w-24 shrink-0">{(m.date as string) ?? "—"}</span>
                        <span>{m.description as string}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {!mutation.isSuccess && !mutation.isPending && !mutation.isError && (
            <EmptyState icon={FileSearch} title="Scouting Reports" description="Generate AI-powered research reports for any company." />
          )}
        </div>
      </div>
    </div>
  );
}
