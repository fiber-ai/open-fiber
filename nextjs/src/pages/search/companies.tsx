import { useState, useCallback } from "react";
import { Search } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Header } from "@/components/layout/header";
import { CompanySearchForm } from "@/components/search/company-search-form";
import { CompanyTable, type CompanyRow } from "@/components/search/company-table";
import { CompanyDetailSheet } from "@/components/search/company-detail-sheet";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorDisplay } from "@/components/shared/error-display";
import type { CompanySearchParams } from "@/lib/schemas/search";

export default function CompanySearchPage() {
  const [pageSize, setPageSize] = useState(25);
  const [cursorStack, setCursorStack] = useState<(string | null)[]>([null]);
  const [selectedCompany, setSelectedCompany] = useState<CompanyRow | null>(null);

  const searchMutation = trpc.search.companySearch.useMutation();

  const currentCursor = cursorStack[cursorStack.length - 1] ?? null;

  const [exclusionListIDs, setExclusionListIDs] = useState<string[] | undefined>(undefined);

  const handleSearch = useCallback(
    (params: CompanySearchParams, exclIDs?: string[]) => {
      setCursorStack([null]);
      setExclusionListIDs(exclIDs);
      searchMutation.mutate({
        searchParams: params,
        pageSize,
        cursor: null,
        companyExclusionListIDs: exclIDs,
      });
    },
    [searchMutation, pageSize]
  );

  const handleNextPage = useCallback(() => {
    const result = searchMutation.data;
    const nextCursor = result?.output?.nextCursor;
    if (!nextCursor) return;

    setCursorStack((prev) => [...prev, nextCursor]);
    searchMutation.mutate({
      searchParams: searchMutation.variables?.searchParams ?? {},
      pageSize,
      cursor: nextCursor,
      companyExclusionListIDs: exclusionListIDs,
    });
  }, [searchMutation, pageSize, exclusionListIDs]);

  const handlePrevPage = useCallback(() => {
    if (cursorStack.length <= 1) return;

    const newStack = cursorStack.slice(0, -1);
    setCursorStack(newStack);
    const prevCursor = newStack.length >= 2 ? newStack[newStack.length - 1] : null;
    searchMutation.mutate({
      searchParams: searchMutation.variables?.searchParams ?? {},
      pageSize,
      cursor: prevCursor,
      companyExclusionListIDs: exclusionListIDs,
    });
  }, [searchMutation, pageSize, cursorStack, exclusionListIDs]);

  const handlePageSizeChange = useCallback(
    (newSize: number) => {
      setPageSize(newSize);
      if (searchMutation.variables) {
        setCursorStack([null]);
        searchMutation.mutate({
          searchParams: searchMutation.variables.searchParams,
          pageSize: newSize,
          cursor: null,
          companyExclusionListIDs: exclusionListIDs,
        });
      }
    },
    [searchMutation, exclusionListIDs]
  );

  const result = searchMutation.data;
  const companies = (result?.output?.data ?? []) as CompanyRow[];
  const hasNextPage = !!result?.output?.nextCursor;
  const hasPrevPage = cursorStack.length > 1;
  const hasResults = searchMutation.isSuccess && companies.length > 0;
  const hasSearched = searchMutation.isSuccess || searchMutation.isError;

  return (
    <div className="flex h-full">
      {/* Filter Sidebar */}
      <div className="w-80 shrink-0 border-r bg-card">
        <div className="flex h-14 items-center border-b px-4">
          <h2 className="text-sm font-semibold">Filters</h2>
        </div>
        <div className="h-[calc(100vh-3.5rem)]">
          <CompanySearchForm
            onSearch={handleSearch}
            isSearching={searchMutation.isPending}
          />
        </div>
      </div>

      {/* Results */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title="Company Search" description="Search companies with 40+ filters" />

        <div className="flex-1 overflow-y-auto">
          {!hasSearched && (
            <EmptyState
              icon={Search}
              title="Search for companies"
              description="Configure filters on the left and click Search to find companies."
            />
          )}

          {searchMutation.isError && (
            <div className="p-6">
              <ErrorDisplay
                message={searchMutation.error.message}
                onRetry={() => {
                  if (searchMutation.variables) {
                    searchMutation.mutate(searchMutation.variables);
                  }
                }}
              />
            </div>
          )}

          {searchMutation.isPending && (
            <CompanyTable data={[]} isLoading />
          )}

          {hasResults && (
            <div className="p-4">
              <CompanyTable
                data={companies}
                onRowClick={(row) => setSelectedCompany(row)}
              />
            </div>
          )}

          {hasSearched && !searchMutation.isPending && companies.length === 0 && !searchMutation.isError && (
            <EmptyState
              icon={Search}
              title="No companies found"
              description="Try adjusting your filters to broaden the search."
            />
          )}
        </div>

        {hasResults && (
          <PaginationControls
            hasNextPage={hasNextPage}
            hasPrevPage={hasPrevPage}
            onNext={handleNextPage}
            onPrev={handlePrevPage}
            pageSize={pageSize}
            onPageSizeChange={handlePageSizeChange}
            resultCount={companies.length}
          />
        )}
      </div>

      {/* Detail Sheet */}
      {selectedCompany && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/20"
            onClick={() => setSelectedCompany(null)}
          />
          <CompanyDetailSheet
            company={selectedCompany}
            onClose={() => setSelectedCompany(null)}
          />
        </>
      )}
    </div>
  );
}

interface SearchResult {
  output?: {
    data?: unknown[];
    nextCursor?: string | null;
  };
  chargeInfo?: {
    creditsCharged?: number;
  };
}
