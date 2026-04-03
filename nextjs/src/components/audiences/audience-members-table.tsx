import { useState } from "react";
import { Building2, UserSearch } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { EmptyState } from "@/components/shared/empty-state";

interface AudienceMembersTableProps {
  audienceId: string;
}

type ActiveTab = "companies" | "prospects";

export function AudienceMembersTable({ audienceId }: AudienceMembersTableProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("companies");
  const [pageSize, setPageSize] = useState(25);
  const [companyCursor, setCompanyCursor] = useState<string | undefined>(undefined);
  const [prospectCursor, setProspectCursor] = useState<string | undefined>(undefined);

  const companies = trpc.audiences.getCompanies.useQuery(
    { audienceId, pageSize, cursor: companyCursor },
    { enabled: activeTab === "companies" }
  );

  const prospects = trpc.audiences.getProspects.useQuery(
    { audienceId, pageSize, cursor: prospectCursor },
    { enabled: activeTab === "prospects" }
  );

  const companiesData = companies.data;
  const prospectsData = prospects.data;

  return (
    <div>
      {/* Tab Bar */}
      <div className="flex items-center gap-2 border-b px-4 pt-3">
        <button
          className={`flex items-center gap-1.5 border-b-2 px-3 pb-2 text-sm font-medium transition-colors ${
            activeTab === "companies"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("companies")}
        >
          <Building2 className="h-4 w-4" />
          Companies
          {companiesData?.output?.totalCount != null && (
            <Badge variant="secondary" className="text-xs">
              {companiesData.output.totalCount}
            </Badge>
          )}
        </button>
        <button
          className={`flex items-center gap-1.5 border-b-2 px-3 pb-2 text-sm font-medium transition-colors ${
            activeTab === "prospects"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("prospects")}
        >
          <UserSearch className="h-4 w-4" />
          Prospects
          {prospectsData?.output?.totalCount != null && (
            <Badge variant="secondary" className="text-xs">
              {prospectsData.output.totalCount}
            </Badge>
          )}
        </button>
      </div>

      {/* Companies Tab */}
      {activeTab === "companies" && (
        <div>
          {companies.isLoading && <LoadingSkeleton rows={5} />}
          {companiesData?.output?.companies?.length === 0 && (
            <EmptyState icon={Building2} title="No companies" description="This audience has no companies yet." />
          )}
          {companiesData?.output?.companies && companiesData.output.companies.length > 0 && (
            <>
              <div className="rounded-md border m-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-2 text-left font-medium">Company</th>
                      <th className="px-4 py-2 text-left font-medium">Domain</th>
                      <th className="px-4 py-2 text-left font-medium">Industry</th>
                      <th className="px-4 py-2 text-left font-medium">Headcount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {companiesData.output.companies.map((c) => (
                      <tr key={c.companyId} className="border-b">
                        <td className="px-4 py-2 font-medium">{c.name ?? "-"}</td>
                        <td className="px-4 py-2 text-muted-foreground">{c.domain ?? "-"}</td>
                        <td className="px-4 py-2 text-muted-foreground">{c.industry ?? "-"}</td>
                        <td className="px-4 py-2 text-muted-foreground">{c.headcount ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <PaginationControls
                hasNextPage={!!companiesData.output.hasMore}
                hasPrevPage={!!companyCursor}
                onNext={() => {
                  if (companiesData.output.nextCursor)
                    setCompanyCursor(companiesData.output.nextCursor);
                }}
                onPrev={() => setCompanyCursor(undefined)}
                pageSize={pageSize}
                onPageSizeChange={setPageSize}
                resultCount={companiesData.output.companies.length}
              />
            </>
          )}
        </div>
      )}

      {/* Prospects Tab */}
      {activeTab === "prospects" && (
        <div>
          {prospects.isLoading && <LoadingSkeleton rows={5} />}
          {prospectsData?.output?.prospects?.length === 0 && (
            <EmptyState icon={UserSearch} title="No prospects" description="This audience has no prospects yet." />
          )}
          {prospectsData?.output?.prospects && prospectsData.output.prospects.length > 0 && (
            <>
              <div className="rounded-md border m-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-2 text-left font-medium">Name</th>
                      <th className="px-4 py-2 text-left font-medium">Title</th>
                      <th className="px-4 py-2 text-left font-medium">Company</th>
                      <th className="px-4 py-2 text-left font-medium">Location</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prospectsData.output.prospects.map((p) => (
                      <tr key={p.prospectId} className="border-b">
                        <td className="px-4 py-2 font-medium">
                          {[p.firstName, p.lastName].filter(Boolean).join(" ") || "-"}
                        </td>
                        <td className="px-4 py-2 text-muted-foreground">{p.jobTitle ?? "-"}</td>
                        <td className="px-4 py-2 text-muted-foreground">{p.companyName ?? "-"}</td>
                        <td className="px-4 py-2 text-muted-foreground">{p.location ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <PaginationControls
                hasNextPage={!!prospectsData.output.hasMore}
                hasPrevPage={!!prospectCursor}
                onNext={() => {
                  if (prospectsData.output.nextCursor)
                    setProspectCursor(prospectsData.output.nextCursor);
                }}
                onPrev={() => setProspectCursor(undefined)}
                pageSize={pageSize}
                onPageSizeChange={setPageSize}
                resultCount={prospectsData.output.prospects.length}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}

