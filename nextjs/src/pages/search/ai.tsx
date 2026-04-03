import { useState } from "react";
import { Zap, Building2, UserSearch } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Header } from "@/components/layout/header";
import { AISearchInput } from "@/components/search/ai-search-input";
import { CompanyTable, type CompanyRow } from "@/components/search/company-table";
import { ProspectTable, type ProspectRow } from "@/components/search/prospect-table";
import { CompanyDetailSheet } from "@/components/search/company-detail-sheet";
import { ProspectDetailSheet } from "@/components/search/prospect-detail-sheet";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorDisplay } from "@/components/shared/error-display";
import { Badge } from "@/components/ui/badge";

type ResultType = "companies" | "prospects" | null;

export default function AISearchPage() {
  const [resultType, setResultType] = useState<ResultType>(null);
  const [selectedCompany, setSelectedCompany] = useState<CompanyRow | null>(null);
  const [selectedProspect, setSelectedProspect] = useState<ProspectRow | null>(null);
  const [pageSize] = useState(25);

  const companySearch = trpc.search.textToCompanySearch.useMutation();
  const prospectSearch = trpc.search.textToProfileSearch.useMutation();

  const handleSearchCompanies = (query: string) => {
    setResultType("companies");
    companySearch.mutate({ query, pageSize });
  };

  const handleSearchProspects = (query: string) => {
    setResultType("prospects");
    prospectSearch.mutate({ query, pageSize });
  };

  const isLoading = companySearch.isPending || prospectSearch.isPending;

  const companyResult = companySearch.data;
  const prospectResult = prospectSearch.data;

  const companies = (companyResult?.output?.data ?? []) as CompanyRow[];
  const prospects = (prospectResult?.output?.data ?? []) as ProspectRow[];

  const activeError =
    resultType === "companies" ? companySearch.error :
    resultType === "prospects" ? prospectSearch.error : null;

  return (
    <div className="flex h-full flex-col">
      <Header
        title="AI Search"
        description="Describe what you're looking for in plain English"
      />

      <div className="border-b p-6">
        <div className="mx-auto max-w-2xl">
          <div className="mb-4 flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">Powered by Fiber AI</span>
          </div>
          <AISearchInput
            onSearchCompanies={handleSearchCompanies}
            onSearchProspects={handleSearchProspects}
            isLoading={isLoading}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeError && (
          <div className="p-6">
            <ErrorDisplay message={activeError.message} />
          </div>
        )}

        {resultType === "companies" && companySearch.isSuccess && (
          <div className="p-4">
            <div className="mb-3 flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span className="text-sm font-medium">Company Results</span>
              <Badge variant="secondary" className="text-xs">
                {companies.length}
              </Badge>
            </div>
            {companies.length > 0 ? (
              <CompanyTable data={companies} onRowClick={(r) => setSelectedCompany(r)} />
            ) : (
              <EmptyState
                icon={Building2}
                title="No companies found"
                description="Try rephrasing your search query."
              />
            )}
          </div>
        )}

        {resultType === "prospects" && prospectSearch.isSuccess && (
          <div className="p-4">
            <div className="mb-3 flex items-center gap-2">
              <UserSearch className="h-4 w-4" />
              <span className="text-sm font-medium">Prospect Results</span>
              <Badge variant="secondary" className="text-xs">
                {prospects.length}
              </Badge>
            </div>
            {prospects.length > 0 ? (
              <ProspectTable data={prospects} onRowClick={(r) => setSelectedProspect(r)} />
            ) : (
              <EmptyState
                icon={UserSearch}
                title="No prospects found"
                description="Try rephrasing your search query."
              />
            )}
          </div>
        )}

        {!resultType && !isLoading && (
          <EmptyState
            icon={Zap}
            title="AI-Powered Search"
            description='Type a natural language description above and click "Search Companies" or "Search Prospects" to find results.'
          />
        )}
      </div>

      {/* Detail Sheets */}
      {selectedCompany && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setSelectedCompany(null)} />
          <CompanyDetailSheet company={selectedCompany} onClose={() => setSelectedCompany(null)} />
        </>
      )}
      {selectedProspect && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setSelectedProspect(null)} />
          <ProspectDetailSheet prospect={selectedProspect} onClose={() => setSelectedProspect(null)} />
        </>
      )}
    </div>
  );
}
