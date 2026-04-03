import { useState, useCallback } from "react";
import { Search, Building2, UserSearch } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Header } from "@/components/layout/header";
import { CompanyTable, type CompanyRow } from "@/components/search/company-table";
import { ProspectTable, type ProspectRow } from "@/components/search/prospect-table";
import { CompanyDetailSheet } from "@/components/search/company-detail-sheet";
import { ProspectDetailSheet } from "@/components/search/prospect-detail-sheet";
import { PollingIndicator } from "@/components/shared/polling-indicator";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorDisplay } from "@/components/shared/error-display";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MultiSelect } from "@/components/shared/multi-select";
import { industry, FUNDING_STAGE_LABELS } from "@/lib/schemas/search";
import type { CompanySearchParams, PeopleSearchParams } from "@/lib/schemas/search";

const INDUSTRY_OPTIONS = industry.options.map((v) => ({ value: v, label: v }));
const FUNDING_OPTIONS = Object.entries(FUNDING_STAGE_LABELS).map(([v, l]) => ({ value: v, label: l }));

type ActiveTab = "companies" | "prospects";

export default function CombinedSearchPage() {
  // Filter state
  const [industries, setIndustries] = useState<string[]>([]);
  const [countries, setCountries] = useState("");
  const [stages, setStages] = useState<string[]>([]);
  const [jobTitles, setJobTitles] = useState("");
  const [pageSize] = useState(25);

  // Search state
  const [searchId, setSearchId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("companies");
  const [selectedCompany, setSelectedCompany] = useState<CompanyRow | null>(null);
  const [selectedProspect, setSelectedProspect] = useState<ProspectRow | null>(null);

  const startSearch = trpc.search.startCombinedSearch.useMutation({
    onSuccess: (data) => {
      
      const id = data?.output?.searchID;
      if (id) setSearchId(id);
    },
  });

  const pollCompanies = trpc.search.pollCombinedSearch.useQuery(
    { searchId: searchId!, entityType: "company", pageSize },
    {
      enabled: !!searchId,
      refetchInterval: (query) => {
        const data = query.state.data;
        if (data?.output?.status === "COMPLETED") return false;
        return 2000;
      },
    }
  );

  const pollProspects = trpc.search.pollCombinedSearch.useQuery(
    { searchId: searchId!, entityType: "profile", pageSize },
    {
      enabled: !!searchId,
      refetchInterval: (query) => {
        const data = query.state.data;
        if (data?.output?.status === "COMPLETED") return false;
        return 2000;
      },
    }
  );

  const handleSearch = useCallback(() => {
    setSearchId(null);
    const companyParams: CompanySearchParams = {};
    const countryArr = countries.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
    if (countryArr.length) companyParams.headquartersCountryCode = { anyOf: countryArr };
    if (industries.length) companyParams.industriesV2 = { anyOf: industries as never[] };
    if (stages.length) companyParams.stage = { anyOf: stages as never[] };

    const profileParams: PeopleSearchParams = {};
    const titles = jobTitles.split(",").map((s) => s.trim()).filter(Boolean);
    if (titles.length) {
      profileParams.jobTitleV2 = {
        anyOf: titles.map((t) => ({ tag: "term" as const, value: t, modifiers: { currentOnly: true } })),
      };
    }

    startSearch.mutate({ companyParams, profileParams });
  }, [industries, countries, stages, jobTitles, startSearch]);

  const companiesResult = pollCompanies.data;
  const prospectsResult = pollProspects.data;
  const companies = (companiesResult?.output?.data?.items ?? []) as CompanyRow[];
  const prospects = (prospectsResult?.output?.data?.items ?? []) as ProspectRow[];
  const isPolling =
    searchId !== null &&
    (companiesResult?.output?.status !== "COMPLETED" ||
      prospectsResult?.output?.status !== "COMPLETED");
  const isComplete = searchId !== null && !isPolling && !startSearch.isPending;

  return (
    <div className="flex h-full flex-col">
      <Header
        title="Combined Search"
        description="Find companies first, then find the right people at those companies"
      />

      {/* Quick Filters */}
      <div className="border-b p-4 space-y-3">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Industries</Label>
            <MultiSelect
              options={INDUSTRY_OPTIONS}
              selected={industries}
              onChange={setIndustries}
              placeholder="Select industries..."
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Countries</Label>
            <Input
              placeholder="e.g. USA, GBR"
              value={countries}
              onChange={(e) => setCountries(e.target.value)}
              className="text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Funding Stage</Label>
            <MultiSelect
              options={FUNDING_OPTIONS}
              selected={stages}
              onChange={setStages}
              placeholder="Select stages..."
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Job Titles</Label>
            <Input
              placeholder="e.g. CEO, CTO"
              value={jobTitles}
              onChange={(e) => setJobTitles(e.target.value)}
              className="text-sm"
            />
          </div>
        </div>
        <Button
          onClick={handleSearch}
          disabled={startSearch.isPending || isPolling}
        >
          {startSearch.isPending || isPolling ? (
            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <Search className="mr-2 h-4 w-4" />
          )}
          Search Companies + Prospects
        </Button>
      </div>

      {/* Polling State */}
      {isPolling && <PollingIndicator message="Searching for companies and prospects..." />}

      {startSearch.isError && (
        <div className="p-6">
          <ErrorDisplay message={startSearch.error.message} onRetry={handleSearch} />
        </div>
      )}

      {/* Results */}
      {isComplete && (
        <div className="flex-1 overflow-y-auto">
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
              <Badge variant="secondary" className="text-xs">{companies.length}</Badge>
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
              <Badge variant="secondary" className="text-xs">{prospects.length}</Badge>
            </button>
          </div>

          <div className="p-4">
            {activeTab === "companies" && (
              companies.length > 0 ? (
                <CompanyTable data={companies} onRowClick={(r) => setSelectedCompany(r)} />
              ) : (
                <EmptyState icon={Building2} title="No companies found" description="Try broader filters." />
              )
            )}
            {activeTab === "prospects" && (
              prospects.length > 0 ? (
                <ProspectTable data={prospects} onRowClick={(r) => setSelectedProspect(r)} />
              ) : (
                <EmptyState icon={UserSearch} title="No prospects found" description="Try broader filters or different job titles." />
              )
            )}
          </div>
        </div>
      )}

      {!searchId && !startSearch.isPending && !startSearch.isError && (
        <EmptyState
          icon={Search}
          title="Combined Company + Prospect Search"
          description="Set filters above and click Search to find companies and their employees together."
        />
      )}

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

interface PollResult {
  output?: {
    status?: string;
    data?: { items?: unknown[] };
    nextCursor?: string | null;
  };
}
