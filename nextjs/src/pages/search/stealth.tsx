import { useState } from "react";
import { Ghost, Search, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProspectTable, type ProspectRow } from "@/components/search/prospect-table";
import { ProspectDetailSheet } from "@/components/search/prospect-detail-sheet";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorDisplay } from "@/components/shared/error-display";
import { ToggleButtonGroup } from "@/components/shared/toggle-button-group";
import type { PeopleSearchParams } from "@/lib/schemas/search";

type Mode = "in-stealth" | "left-stealth";

export default function StealthPage() {
  const [mode, setMode] = useState<Mode>("in-stealth");
  const [jobTitles, setJobTitles] = useState("");
  const [countries, setCountries] = useState("");
  const [selected, setSelected] = useState<ProspectRow | null>(null);

  const search = trpc.stealth.search.useMutation();

  const buildParams = (): PeopleSearchParams => {
    const params: PeopleSearchParams = {};
    const titles = jobTitles.split(",").map((s) => s.trim()).filter(Boolean);
    if (titles.length) params.jobTitleV2 = { anyOf: titles.map((t) => ({ type: "term" as const, term: t })) };
    const countryArr = countries.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
    if (countryArr.length) params.country3LetterCode = { anyOf: countryArr };
    return params;
  };

  const handleSearch = () => {
    search.mutate({ mode, searchParams: buildParams() });
  };

  // Each result is { profile, stealthCareer } — unwrap the profile for the table.
  const results = ((search.data?.output?.data ?? []) as Array<Record<string, unknown>>)
    .map((d) => (d.profile ?? d) as ProspectRow);

  return (
    <div className="flex h-full flex-col">
      <Header icon={Ghost} title="Stealth Founders" description="Find founders currently in stealth or who recently left stealth" />

      <div className="border-b p-4 space-y-3">
        <ToggleButtonGroup
          options={[
            { value: "in-stealth" as Mode, label: "Currently in stealth", icon: Ghost },
            { value: "left-stealth" as Mode, label: "Left stealth", icon: Ghost },
          ]}
          value={mode}
          onChange={(v) => setMode(v as Mode)}
        />
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[220px] space-y-1.5">
            <Label className="text-xs font-medium">Job Titles (optional)</Label>
            <Input placeholder="e.g. Founder, CEO" value={jobTitles} onChange={(e) => setJobTitles(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Countries (optional)</Label>
            <Input placeholder="e.g. USA, GBR" value={countries} onChange={(e) => setCountries(e.target.value)} className="w-40" />
          </div>
          <Button onClick={handleSearch} disabled={search.isPending}>
            {search.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
            Search
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {search.isError && <ErrorDisplay message={search.error.message} />}
        {search.isSuccess && results.length === 0 && (
          <EmptyState icon={Ghost} title="No founders found" description="Try a different stealth mode or relax the filters." />
        )}
        {results.length > 0 && <ProspectTable data={results} onRowClick={(r) => setSelected(r)} />}
        {!search.data && !search.isPending && !search.isError && (
          <EmptyState icon={Ghost} title="Stealth founder search" description="Pick a stealth mode and search. Add title/country filters to narrow." />
        )}
      </div>

      {selected && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setSelected(null)} />
          <ProspectDetailSheet prospect={selected} onClose={() => setSelected(null)} />
        </>
      )}
    </div>
  );
}
