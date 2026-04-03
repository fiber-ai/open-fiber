import { useState, useCallback } from "react";
import { UserSearch } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Header } from "@/components/layout/header";
import { ProspectSearchForm } from "@/components/search/prospect-search-form";
import { ProspectTable, type ProspectRow } from "@/components/search/prospect-table";
import { ProspectDetailSheet } from "@/components/search/prospect-detail-sheet";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorDisplay } from "@/components/shared/error-display";
import type { PeopleSearchParams } from "@/lib/schemas/search";

export default function ProspectSearchPage() {
  const [pageSize, setPageSize] = useState(25);
  const [cursorStack, setCursorStack] = useState<(string | null)[]>([null]);
  const [selectedProspect, setSelectedProspect] = useState<ProspectRow | null>(null);

  const searchMutation = trpc.search.peopleSearch.useMutation();
  const [prospectExclIDs, setProspectExclIDs] = useState<string[] | undefined>(undefined);
  const [companyExclIDs, setCompanyExclIDs] = useState<string[] | undefined>(undefined);

  const handleSearch = useCallback(
    (params: PeopleSearchParams, pExclIDs?: string[], cExclIDs?: string[]) => {
      setCursorStack([null]);
      setProspectExclIDs(pExclIDs);
      setCompanyExclIDs(cExclIDs);
      searchMutation.mutate({ searchParams: params, pageSize, cursor: null, prospectExclusionListIDs: pExclIDs, companyExclusionListIDs: cExclIDs });
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
      prospectExclusionListIDs: prospectExclIDs,
      companyExclusionListIDs: companyExclIDs,
    });
  }, [searchMutation, pageSize, prospectExclIDs, companyExclIDs]);

  const handlePrevPage = useCallback(() => {
    if (cursorStack.length <= 1) return;
    const newStack = cursorStack.slice(0, -1);
    setCursorStack(newStack);
    searchMutation.mutate({
      searchParams: searchMutation.variables?.searchParams ?? {},
      pageSize,
      cursor: newStack.length >= 2 ? newStack[newStack.length - 1] : null,
      prospectExclusionListIDs: prospectExclIDs,
      companyExclusionListIDs: companyExclIDs,
    });
  }, [searchMutation, pageSize, cursorStack, prospectExclIDs, companyExclIDs]);

  const handlePageSizeChange = useCallback(
    (newSize: number) => {
      setPageSize(newSize);
      if (searchMutation.variables) {
        setCursorStack([null]);
        searchMutation.mutate({
          searchParams: searchMutation.variables.searchParams,
          pageSize: newSize,
          cursor: null,
          prospectExclusionListIDs: prospectExclIDs,
          companyExclusionListIDs: companyExclIDs,
        });
      }
    },
    [searchMutation, prospectExclIDs, companyExclIDs]
  );

  const result = searchMutation.data;
  const prospects = (result?.output?.data ?? []) as ProspectRow[];
  const hasNextPage = !!result?.output?.nextCursor;
  const hasPrevPage = cursorStack.length > 1;
  const hasResults = searchMutation.isSuccess && prospects.length > 0;
  const hasSearched = searchMutation.isSuccess || searchMutation.isError;

  return (
    <div className="flex h-full">
      {/* Filter Sidebar */}
      <div className="w-80 shrink-0 border-r bg-card">
        <div className="flex h-14 items-center border-b px-4">
          <h2 className="text-sm font-semibold">Filters</h2>
        </div>
        <div className="h-[calc(100vh-3.5rem)]">
          <ProspectSearchForm onSearch={handleSearch} isSearching={searchMutation.isPending} />
        </div>
      </div>

      {/* Results */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title="Prospect Search" description="Find people by title, location, and more" />

        <div className="flex-1 overflow-y-auto">
          {!hasSearched && (
            <EmptyState
              icon={UserSearch}
              title="Search for prospects"
              description="Configure filters on the left and click Search to find people."
            />
          )}
          {searchMutation.isError && (
            <div className="p-6">
              <ErrorDisplay
                message={searchMutation.error.message}
                onRetry={() => {
                  if (searchMutation.variables) searchMutation.mutate(searchMutation.variables);
                }}
              />
            </div>
          )}
          {searchMutation.isPending && <ProspectTable data={[]} isLoading />}
          {hasResults && (
            <div className="p-4">
              <ProspectTable data={prospects} onRowClick={(row) => setSelectedProspect(row)} />
            </div>
          )}
          {hasSearched && !searchMutation.isPending && prospects.length === 0 && !searchMutation.isError && (
            <EmptyState
              icon={UserSearch}
              title="No prospects found"
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
            resultCount={prospects.length}
          />
        )}
      </div>

      {selectedProspect && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setSelectedProspect(null)} />
          <ProspectDetailSheet prospect={selectedProspect} onClose={() => setSelectedProspect(null)} />
        </>
      )}
    </div>
  );
}

interface SearchResult {
  output?: { data?: unknown[]; nextCursor?: string | null };
}
