import { useState } from "react";
import { useRouter } from "next/router";
import { ArrowLeft, Play, Loader2, Building2, UserSearch, Clock } from "lucide-react";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorDisplay } from "@/components/shared/error-display";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { PollingIndicator } from "@/components/shared/polling-indicator";

type ActiveTab = "companies" | "profiles" | "runs";

export default function SavedSearchDetailPage() {
  const router = useRouter();
  const id = router.query.id as string;
  const utils = trpc.useUtils();

  const [tab, setTab] = useState<ActiveTab>("companies");
  const [pageSize, setPageSize] = useState(25);
  const [companyCursor, setCompanyCursor] = useState<string | null>(null);
  const [profileCursor, setProfileCursor] = useState<string | null>(null);

  // Fetch saved search details
  const detailQuery = trpc.savedSearches.get.useQuery(
    { savedSearchId: id },
    { enabled: !!id }
  );

  // Spawn run
  const spawnMutation = trpc.savedSearches.spawnRun.useMutation({
    onSuccess: () => {
      utils.savedSearches.listRuns.invalidate({ savedSearchId: id });
    },
  });

  // Run history
  const runsQuery = trpc.savedSearches.listRuns.useQuery(
    { savedSearchId: id, pageSize: 10 },
    { enabled: !!id && tab === "runs" }
  );

  // Current companies
  const companiesQuery = trpc.savedSearches.getCurrentCompanies.useQuery(
    { savedSearchId: id, pageSize, cursor: companyCursor ?? undefined },
    { enabled: !!id && tab === "companies", placeholderData: (prev) => prev }
  );

  // Current profiles
  const profilesQuery = trpc.savedSearches.getCurrentProfiles.useQuery(
    { savedSearchId: id, pageSize, cursor: profileCursor ?? undefined },
    { enabled: !!id && tab === "profiles", placeholderData: (prev) => prev }
  );

  const detail = detailQuery.data?.output;
  const name = (detail as Record<string, unknown>)?.name as string ?? "Saved Search";
  const companies = companiesQuery.data?.output?.companies ?? [];
  const profiles = profilesQuery.data?.output?.profiles ?? [];
  const runsOutput = runsQuery.data?.output as Record<string, unknown> | undefined;
  const runs = ((runsOutput?.runs ?? runsOutput?.data ?? []) as Array<Record<string, unknown>>);

  if (!id) return null;

  return (
    <div className="flex h-full flex-col">
      <Header title={name} description={detail ? `Saved search` : undefined}>
        <Link href="/saved-searches">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
        </Link>
        <Button
          variant="outline"
          size="sm"
          onClick={() => spawnMutation.mutate({ savedSearchId: id })}
          disabled={spawnMutation.isPending}
        >
          {spawnMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Play className="mr-2 h-4 w-4" />
          )}
          Run Now
        </Button>
      </Header>

      {detailQuery.isLoading && <div className="p-6"><LoadingSkeleton rows={3} /></div>}
      {detailQuery.isError && <div className="p-6"><ErrorDisplay message={detailQuery.error.message} /></div>}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b px-4 pt-3">
        <button
          className={`flex items-center gap-1.5 border-b-2 px-3 pb-2 text-sm font-medium transition-colors ${
            tab === "companies" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setTab("companies")}
        >
          <Building2 className="h-4 w-4" /> Current Companies
        </button>
        <button
          className={`flex items-center gap-1.5 border-b-2 px-3 pb-2 text-sm font-medium transition-colors ${
            tab === "profiles" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setTab("profiles")}
        >
          <UserSearch className="h-4 w-4" /> Current Profiles
        </button>
        <button
          className={`flex items-center gap-1.5 border-b-2 px-3 pb-2 text-sm font-medium transition-colors ${
            tab === "runs" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setTab("runs")}
        >
          <Clock className="h-4 w-4" /> Run History
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Companies tab */}
        {tab === "companies" && (
          <div>
            {companiesQuery.isLoading && <div className="p-6"><LoadingSkeleton rows={5} /></div>}
            {companiesQuery.isError && <div className="p-6"><ErrorDisplay message={companiesQuery.error.message} /></div>}
            {companies.length === 0 && companiesQuery.isSuccess && (
              <EmptyState icon={Building2} title="No companies" description="Run this saved search to populate companies." />
            )}
            {companies.length > 0 && (
              <>
                <div className="rounded-md border m-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-4 py-2 text-left font-medium">Company</th>
                        <th className="px-4 py-2 text-left font-medium">Domain</th>
                        <th className="px-4 py-2 text-left font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {companies.map((c, i) => (
                        <tr key={i} className="border-b">
                          <td className="px-4 py-2 font-medium">{String((c as Record<string, unknown>).name ?? "—")}</td>
                          <td className="px-4 py-2 text-muted-foreground font-mono text-xs">{String((c as Record<string, unknown>).domain ?? "—")}</td>
                          <td className="px-4 py-2">
                            {(c as Record<string, unknown>).status ? (
                              <Badge variant="outline" className="text-xs">{String((c as Record<string, unknown>).status)}</Badge>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <PaginationControls
                  hasNextPage={!!companiesQuery.data?.output?.nextCursor}
                  hasPrevPage={!!companyCursor}
                  onNext={() => setCompanyCursor(companiesQuery.data?.output?.nextCursor ?? null)}
                  onPrev={() => setCompanyCursor(null)}
                  pageSize={pageSize}
                  onPageSizeChange={(s) => { setPageSize(s); setCompanyCursor(null); }}
                  resultCount={companies.length}
                />
              </>
            )}
          </div>
        )}

        {/* Profiles tab */}
        {tab === "profiles" && (
          <div>
            {profilesQuery.isLoading && <div className="p-6"><LoadingSkeleton rows={5} /></div>}
            {profilesQuery.isError && <div className="p-6"><ErrorDisplay message={profilesQuery.error.message} /></div>}
            {profiles.length === 0 && profilesQuery.isSuccess && (
              <EmptyState icon={UserSearch} title="No profiles" description="Run this saved search to populate profiles." />
            )}
            {profiles.length > 0 && (
              <>
                <div className="rounded-md border m-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-4 py-2 text-left font-medium">Name</th>
                        <th className="px-4 py-2 text-left font-medium">Title</th>
                        <th className="px-4 py-2 text-left font-medium">Company</th>
                        <th className="px-4 py-2 text-left font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profiles.map((p, i) => {
                        const pr = p as Record<string, unknown>;
                        return (
                          <tr key={i} className="border-b">
                            <td className="px-4 py-2 font-medium">{(pr.name as string) ?? ([pr.firstName, pr.lastName].filter(Boolean).join(" ") || "—")}</td>
                            <td className="px-4 py-2 text-muted-foreground">{String(pr.title ?? pr.jobTitle ?? "—")}</td>
                            <td className="px-4 py-2 text-muted-foreground">{String(pr.companyName ?? "—")}</td>
                            <td className="px-4 py-2">
                              {pr.status ? <Badge variant="outline" className="text-xs">{String(pr.status)}</Badge> : null}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <PaginationControls
                  hasNextPage={!!profilesQuery.data?.output?.nextCursor}
                  hasPrevPage={!!profileCursor}
                  onNext={() => setProfileCursor(profilesQuery.data?.output?.nextCursor ?? null)}
                  onPrev={() => setProfileCursor(null)}
                  pageSize={pageSize}
                  onPageSizeChange={(s) => { setPageSize(s); setProfileCursor(null); }}
                  resultCount={profiles.length}
                />
              </>
            )}
          </div>
        )}

        {/* Run History tab */}
        {tab === "runs" && (
          <div className="p-6">
            {runsQuery.isLoading && <LoadingSkeleton rows={4} />}
            {runsQuery.isError && <ErrorDisplay message={runsQuery.error.message} />}
            {runs.length === 0 && runsQuery.isSuccess && (
              <EmptyState icon={Clock} title="No runs yet" description="Click 'Run Now' to execute this saved search." />
            )}
            {runs.length > 0 && (
              <div className="space-y-3">
                {runs.map((run, i) => {
                  const runId = (run.savedSearchRunId ?? run.id) as string;
                  const status = (run.status as string) ?? "unknown";
                  const createdAt = (run.createdAt as string) ?? "";
                  const companiesCount = (run.companiesCount as number) ?? null;
                  const profilesCount = (run.profilesCount as number) ?? null;

                  return (
                    <Card key={runId ?? i}>
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={status === "completed" ? "default" : status === "failed" ? "destructive" : "secondary"}
                              className="text-xs"
                            >
                              {status}
                            </Badge>
                            {createdAt && (
                              <span className="text-xs text-muted-foreground">
                                {new Date(createdAt).toLocaleString()}
                              </span>
                            )}
                          </div>
                          <div className="flex gap-4 text-xs text-muted-foreground">
                            {companiesCount != null && <span>{companiesCount} companies</span>}
                            {profilesCount != null && <span>{profilesCount} profiles</span>}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
