import { useState, useCallback } from "react";
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

type ResultType = "combined" | "companies" | "jd" | null;

export default function AISearchPage() {
  const [resultType, setResultType] = useState<ResultType>(null);
  const [selectedCompany, setSelectedCompany] = useState<CompanyRow | null>(null);
  const [selectedProspect, setSelectedProspect] = useState<ProspectRow | null>(null);

  // Pagination state
  const [companyPageSize, setCompanyPageSize] = useState(25);
  const [profilePageSize, setProfilePageSize] = useState(25);
  const [companyCursor, setCompanyCursor] = useState<string | null>(null);
  const [profileCursor, setProfileCursor] = useState<string | null>(null);
  const [cursorHistory, setCursorHistory] = useState<{ companyCursors: (string | null)[]; profileCursors: (string | null)[] }>({
    companyCursors: [null],
    profileCursors: [null],
  });

  // Store current query for pagination
  const [currentQuery, setCurrentQuery] = useState("");

  const combinedSearch = trpc.search.textToCombinedSearch.useMutation();
  const companySearch = trpc.search.textToCompanySearch.useMutation();
  const jdSearch = trpc.search.jdToProfileSearch.useMutation();

  const handleSearch = useCallback((query: string) => {
    setResultType("combined");
    setCurrentQuery(query);
    setCompanyCursor(null);
    setProfileCursor(null);
    setCursorHistory({ companyCursors: [null], profileCursors: [null] });
    combinedSearch.mutate({
      query,
      companyConfig: {
        pageSize: companyPageSize,
        companyCursor: null,
      },
      profileConfig: {
        pageSize: profilePageSize,
        profileCursor: null,
      },
    });
  }, [companyPageSize, profilePageSize, combinedSearch]);

  const handleSearchCompanies = useCallback((query: string) => {
    setResultType("companies");
    setCurrentQuery(query);
    companySearch.mutate({ query, pageSize: companyPageSize });
  }, [companyPageSize, companySearch]);

  const handleSearchJD = useCallback((query: string) => {
    setResultType("jd");
    setCurrentQuery(query);
    jdSearch.mutate({ request: "initial", query, pageSize: profilePageSize });
  }, [profilePageSize, jdSearch]);

  // Pagination handlers for combined search
  const handleNextProfilePage = useCallback(() => {
    const nextCursor = combinedSearch.data?.output?.profileCursor as string | null;
    if (!nextCursor) return;
    setProfileCursor(nextCursor);
    setCursorHistory((prev) => ({
      ...prev,
      profileCursors: [...prev.profileCursors, nextCursor],
    }));
    combinedSearch.mutate({
      query: currentQuery,
      companyConfig: {
        pageSize: companyPageSize,
        companyCursor,
      },
      profileConfig: {
        pageSize: profilePageSize,
        profileCursor: nextCursor,
      },
    });
  }, [combinedSearch, currentQuery, companyPageSize, profilePageSize, companyCursor]);

  const handlePrevProfilePage = useCallback(() => {
    const newCursors = cursorHistory.profileCursors.slice(0, -1);
    const prevCursor = newCursors[newCursors.length - 1] ?? null;
    setProfileCursor(prevCursor);
    setCursorHistory((prev) => ({ ...prev, profileCursors: newCursors }));
    combinedSearch.mutate({
      query: currentQuery,
      companyConfig: {
        pageSize: companyPageSize,
        companyCursor,
      },
      profileConfig: {
        pageSize: profilePageSize,
        profileCursor: prevCursor,
      },
    });
  }, [combinedSearch, currentQuery, companyPageSize, profilePageSize, companyCursor, cursorHistory.profileCursors]);

  const handleNextCompanyPage = useCallback(() => {
    const nextCursor = combinedSearch.data?.output?.companyCursor as string | null;
    if (!nextCursor) return;
    setCompanyCursor(nextCursor);
    setCursorHistory((prev) => ({
      ...prev,
      companyCursors: [...prev.companyCursors, nextCursor],
    }));
    combinedSearch.mutate({
      query: currentQuery,
      companyConfig: {
        pageSize: companyPageSize,
        companyCursor: nextCursor,
      },
      profileConfig: {
        pageSize: profilePageSize,
        profileCursor,
      },
    });
  }, [combinedSearch, currentQuery, companyPageSize, profilePageSize, profileCursor]);

  const handlePrevCompanyPage = useCallback(() => {
    const newCursors = cursorHistory.companyCursors.slice(0, -1);
    const prevCursor = newCursors[newCursors.length - 1] ?? null;
    setCompanyCursor(prevCursor);
    setCursorHistory((prev) => ({ ...prev, companyCursors: newCursors }));
    combinedSearch.mutate({
      query: currentQuery,
      companyConfig: {
        pageSize: companyPageSize,
        companyCursor: prevCursor,
      },
      profileConfig: {
        pageSize: profilePageSize,
        profileCursor,
      },
    });
  }, [combinedSearch, currentQuery, companyPageSize, profilePageSize, profileCursor, cursorHistory.companyCursors]);

  const handleProfilePageSizeChange = useCallback((size: number) => {
    setProfilePageSize(size);
    setProfileCursor(null);
    setCursorHistory((prev) => ({ ...prev, profileCursors: [null] }));
    if (currentQuery && resultType === "combined") {
      combinedSearch.mutate({
        query: currentQuery,
        companyConfig: { pageSize: companyPageSize, companyCursor },
        profileConfig: { pageSize: size, profileCursor: null },
      });
    }
  }, [combinedSearch, currentQuery, resultType, companyPageSize, companyCursor]);

  const handleCompanyPageSizeChange = useCallback((size: number) => {
    setCompanyPageSize(size);
    setCompanyCursor(null);
    setCursorHistory((prev) => ({ ...prev, companyCursors: [null] }));
    if (currentQuery && resultType === "combined") {
      combinedSearch.mutate({
        query: currentQuery,
        companyConfig: { pageSize: size, companyCursor: null },
        profileConfig: { pageSize: profilePageSize, profileCursor },
      });
    }
  }, [combinedSearch, currentQuery, resultType, profilePageSize, profileCursor]);

  const isLoading = combinedSearch.isPending || companySearch.isPending || jdSearch.isPending;

  // Extract combined results (shape validated by combinedSearchResultSchema in tRPC router)
  const combinedOutput = combinedSearch.data?.output;
  const combinedCompanies = (combinedOutput?.data?.companies ?? []) as CompanyRow[];
  const combinedProspects = (combinedOutput?.data?.profiles ?? []) as ProspectRow[];
  const hasNextProfilePage = !!(combinedOutput?.profileCursor);
  const hasNextCompanyPage = !!(combinedOutput?.companyCursor);

  // Extract company-only results
  const companies = (companySearch.data?.output?.data ?? []) as CompanyRow[];

  // Extract JD results
  const jdProspects = (jdSearch.data?.output?.data ?? []) as ProspectRow[];

  const activeError =
    resultType === "combined" ? combinedSearch.error :
    resultType === "companies" ? companySearch.error :
    resultType === "jd" ? jdSearch.error : null;

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
          <AISearchInput
            onSearch={handleSearch}
            onSearchCompanies={handleSearchCompanies}
            onSearchJD={handleSearchJD}
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

        {/* Combined search results: show both companies and profiles */}
        {resultType === "combined" && combinedSearch.isSuccess && (
          <div className="p-4 space-y-6">
            {/* Company results section */}
            <div>
              <div className="mb-3 flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                <span className="text-sm font-medium">Matching Companies</span>
                <Badge variant="secondary" className="text-xs">
                  {combinedCompanies.length}
                </Badge>
              </div>
              {combinedCompanies.length > 0 ? (
                <>
                  <CompanyTable data={combinedCompanies} onRowClick={(r) => setSelectedCompany(r)} />
                  <PaginationControls
                    hasNextPage={hasNextCompanyPage}
                    hasPrevPage={cursorHistory.companyCursors.length > 1}
                    onNext={handleNextCompanyPage}
                    onPrev={handlePrevCompanyPage}
                    pageSize={companyPageSize}
                    onPageSizeChange={handleCompanyPageSizeChange}
                    resultCount={combinedCompanies.length}
                  />
                </>
              ) : (
                <EmptyState
                  icon={Building2}
                  title="No companies found"
                  description="No companies matched the criteria in your query."
                />
              )}
            </div>

            {/* Profile results section */}
            <div>
              <div className="mb-3 flex items-center gap-2">
                <UserSearch className="h-4 w-4" />
                <span className="text-sm font-medium">Matching Prospects</span>
                <Badge variant="secondary" className="text-xs">
                  {combinedProspects.length}
                </Badge>
              </div>
              {combinedProspects.length > 0 ? (
                <>
                  <ProspectTable data={combinedProspects} onRowClick={(r) => setSelectedProspect(r)} />
                  <PaginationControls
                    hasNextPage={hasNextProfilePage}
                    hasPrevPage={cursorHistory.profileCursors.length > 1}
                    onNext={handleNextProfilePage}
                    onPrev={handlePrevProfilePage}
                    pageSize={profilePageSize}
                    onPageSizeChange={handleProfilePageSizeChange}
                    resultCount={combinedProspects.length}
                  />
                </>
              ) : (
                <EmptyState
                  icon={UserSearch}
                  title="No prospects found"
                  description="No prospects matched the criteria at the matching companies."
                />
              )}
            </div>
          </div>
        )}

        {/* Company-only results */}
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

        {/* JD results */}
        {resultType === "jd" && jdSearch.isSuccess && (
          <div className="p-4">
            <div className="mb-3 flex items-center gap-2">
              <UserSearch className="h-4 w-4" />
              <span className="text-sm font-medium">JD Match Results</span>
              <Badge variant="secondary" className="text-xs">
                {jdProspects.length}
              </Badge>
            </div>
            {jdProspects.length > 0 ? (
              <ProspectTable data={jdProspects} onRowClick={(r) => setSelectedProspect(r)} />
            ) : (
              <EmptyState
                icon={UserSearch}
                title="No matches found"
                description="Try a different job description."
              />
            )}
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
