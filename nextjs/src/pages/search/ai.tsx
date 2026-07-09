import { useState } from "react";
import { Zap, Building2, UserSearch } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Header } from "@/components/layout/header";
import { AISearchInput } from "@/components/search/ai-search-input";
import { CompanyTable, type CompanyRow } from "@/components/search/company-table";
import { ProspectTable, type ProspectRow } from "@/components/search/prospect-table";
import { CompanyDetailSheet } from "@/components/search/company-detail-sheet";
import { ProspectDetailSheet } from "@/components/search/prospect-detail-sheet";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorDisplay } from "@/components/shared/error-display";
import { Badge } from "@/components/ui/badge";

export default function AISearchPage() {
  const [selectedCompany, setSelectedCompany] = useState<CompanyRow | null>(null);
  const [selectedProspect, setSelectedProspect] = useState<ProspectRow | null>(null);

  const nlSearch = trpc.search.nlSearch.useMutation();

  const handleSearch = (query: string) => {
    nlSearch.mutate({ query });
  };

  // Slushie returns a discriminated result: companies OR people (never both).
  const results = nlSearch.data?.output?.results as
    | { resultType?: string; companies?: CompanyRow[]; people?: ProspectRow[] }
    | undefined;
  const kind = results?.resultType;
  const companies = (kind === "companies" ? results?.companies ?? [] : []) as CompanyRow[];
  const prospects = (kind === "people" ? results?.people ?? [] : []) as ProspectRow[];

  return (
    <div className="flex h-full flex-col">
      <Header
        icon={Zap}
        title="AI Search"
        description="Describe what you're looking for in plain English"
      />

      <div className="border-b p-6">
        <div className="mx-auto max-w-2xl">
          <div className="mb-4 flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">Powered by Fiber AI</span>
          </div>
          <AISearchInput onSearch={handleSearch} isLoading={nlSearch.isPending} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {nlSearch.isError && (
          <div className="p-6">
            <ErrorDisplay message={nlSearch.error.message} />
          </div>
        )}

        {nlSearch.isSuccess && kind === "companies" && (
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

        {nlSearch.isSuccess && kind === "people" && (
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

        {nlSearch.isSuccess && kind !== "companies" && kind !== "people" && (
          <div className="p-4">
            <EmptyState
              icon={Zap}
              title="No results"
              description="We couldn't interpret that query. Try describing the companies or people you're looking for."
            />
          </div>
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
