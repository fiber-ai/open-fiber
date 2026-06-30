import { useState } from "react";
import { ChevronDown, ChevronRight, Search, RotateCcw, Hash, Loader2 } from "lucide-react";
import { stripEmpty } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MultiSelect } from "@/components/shared/multi-select";
import { RangeInput } from "@/components/shared/range-input";
import { trpc } from "@/lib/trpc";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { formatNumber } from "@/lib/utils";
import type { PeopleSearchParams } from "@/lib/schemas/search";
import { PROFILE_TAG_LABELS } from "@/lib/schemas/search";

interface ExclusionList { listID?: string; listId?: string; name: string }

interface ProspectSearchFormProps {
  onSearch: (params: PeopleSearchParams, prospectExclIDs?: string[], companyExclIDs?: string[]) => void;
  isSearching: boolean;
}

const TAG_OPTIONS = Object.entries(PROFILE_TAG_LABELS).map(
  ([value, label]) => ({ value, label })
);

const SENIORITY_OPTIONS = [
  { value: "Entry level", label: "Entry Level" },
  { value: "Associate", label: "Associate" },
  { value: "Mid-Senior level", label: "Mid-Senior Level" },
  { value: "Director", label: "Director" },
  { value: "Executive", label: "Executive" },
  { value: "Internship", label: "Internship" },
];

interface FilterSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function FilterSection({ title, children, defaultOpen = false }: FilterSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b">
      <button
        type="button"
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/50"
        onClick={() => setOpen(!open)}
      >
        {title}
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
      {open && <div className="space-y-3 px-4 pb-4">{children}</div>}
    </div>
  );
}

export function ProspectSearchForm({ onSearch, isSearching }: ProspectSearchFormProps) {
  const [params, setParams] = useState<PeopleSearchParams>({});
  const [selectedProspectExcl, setSelectedProspectExcl] = useState<string[]>([]);
  const [selectedCompanyExcl, setSelectedCompanyExcl] = useState<string[]>([]);

  const prospectExclLists = trpc.exclusionLists.listProspectLists.useQuery(undefined, { staleTime: 60_000 });
  const companyExclLists = trpc.exclusionLists.listCompanyLists.useQuery(undefined, { staleTime: 60_000 });
  const prospectExclOptions = (prospectExclLists.data?.output ?? []).map((l) => ({ value: l.listId, label: l.name }));
  const companyExclOptions = (companyExclLists.data?.output ?? []).map((l) => ({ value: l.listID, label: l.name }));

  const update = <K extends keyof PeopleSearchParams>(
    key: K,
    value: PeopleSearchParams[K]
  ) => {
    setParams((prev) => ({ ...prev, [key]: value }));
  };

  // Job title helper state
  const [titleInput, setTitleInput] = useState("");
  const [countryInput, setCountryInput] = useState("");
  const [stateInput, setStateInput] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(
      stripEmpty(params),
      selectedProspectExcl.length > 0 ? selectedProspectExcl : undefined,
      selectedCompanyExcl.length > 0 ? selectedCompanyExcl : undefined,
    );
  };

  const handleReset = () => {
    setParams({});
    setTitleInput("");
    setCountryInput("");
    setStateInput("");
    setSelectedProspectExcl([]);
    setSelectedCompanyExcl([]);
  };

  // Live count
  const debouncedParams = useDebouncedValue(params, 800);
  const hasFilters = Object.keys(stripEmpty(debouncedParams)).length > 0;
  const count = trpc.search.peopleSearchCount.useQuery(
    { searchParams: stripEmpty(debouncedParams) as PeopleSearchParams },
    { enabled: hasFilters, staleTime: 0, retry: false }
  );

  return (
    <form onSubmit={handleSubmit} className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto">
        {/* Job Title */}
        <FilterSection title="Job Title" defaultOpen>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Job Titles</Label>
            <Input
              placeholder="e.g. CEO, VP Engineering, Head of Sales"
              value={titleInput}
              onChange={(e) => {
                setTitleInput(e.target.value);
                const titles = e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean);
                update(
                  "jobTitleV2",
                  titles.length
                    ? {
                        anyOf: titles.map((t) => ({
                          type: "term" as const,
                          term: t,
                        })),
                      }
                    : null
                );
              }}
              className="text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Comma-separated. Matches current titles by default.
            </p>
          </div>
        </FilterSection>

        {/* Location */}
        <FilterSection title="Location">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Country</Label>
            <Input
              placeholder="e.g. USA, GBR, DEU"
              value={countryInput}
              onChange={(e) => {
                setCountryInput(e.target.value);
                const codes = e.target.value
                  .split(",")
                  .map((s) => s.trim().toUpperCase())
                  .filter(Boolean);
                update("country3LetterCode", codes.length ? { anyOf: codes } : null);
              }}
              className="text-sm"
            />
            <p className="text-xs text-muted-foreground">Comma-separated country codes</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">State / Region</Label>
            <Input
              placeholder="e.g. California, New York"
              value={stateInput}
              onChange={(e) => {
                setStateInput(e.target.value);
                const states = e.target.value.split(",").map((s) => s.trim()).filter(Boolean);
                const countryCode = params.country3LetterCode?.anyOf?.[0] ?? "USA";
                update("state", states.length
                  ? { anyOf: states.map((s) => ({ countryCode, stateName: s })) }
                  : null
                );
              }}
              className="text-sm"
            />
          </div>
        </FilterSection>

        {/* Experience */}
        <FilterSection title="Experience">
          <RangeInput
            label="Years of Experience"
            min={params.yearsOfExperience?.lowerBound}
            max={params.yearsOfExperience?.upperBound}
            onMinChange={(v) =>
              update("yearsOfExperience", { ...params.yearsOfExperience, lowerBound: v })
            }
            onMaxChange={(v) =>
              update("yearsOfExperience", { ...params.yearsOfExperience, upperBound: v })
            }
          />
        </FilterSection>

        {/* Tags & Attributes */}
        <FilterSection title="Tags & Attributes">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Profile Tags</Label>
            <MultiSelect
              options={TAG_OPTIONS}
              selected={params.tags?.anyOf ?? []}
              onChange={(val) =>
                update("tags", val.length ? { anyOf: val as never[] } : null)
              }
              placeholder="Select tags..."
            />
          </div>
        </FilterSection>

        {/* Education */}
        <FilterSection title="Education">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">School Name</Label>
            <Input
              placeholder="e.g. Stanford, MIT, Harvard"
              value={
                params.education?.anyOf?.[0]?.school ?? ""
              }
              onChange={(e) => {
                const val = e.target.value.trim();
                update(
                  "education",
                  val ? { anyOf: [{ school: val }] } : null
                );
              }}
              className="text-sm"
            />
          </div>
        </FilterSection>

        {/* Keywords */}
        <FilterSection title="Keywords">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Keywords</Label>
            <Input
              placeholder="e.g. machine learning, sales, growth"
              value={params.keywords?.containsAny?.join(", ") ?? ""}
              onChange={(e) => {
                const kws = e.target.value.split(",").map((s) => s.trim()).filter(Boolean);
                update("keywords", kws.length ? { containsAny: kws } : null);
              }}
              className="text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Searches across headline, summary, skills, and more
            </p>
          </div>
        </FilterSection>

        {/* Languages */}
        <FilterSection title="Languages">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Languages Spoken</Label>
            <Input
              placeholder="e.g. English, Spanish, Mandarin"
              value={params.languages?.anyOf?.join(", ") ?? ""}
              onChange={(e) => {
                const langs = e.target.value.split(",").map((s) => s.trim()).filter(Boolean);
                update("languages", langs.length ? { anyOf: langs } : null);
              }}
              className="text-sm"
            />
          </div>
        </FilterSection>

        {/* Name Search */}
        <FilterSection title="Name Search">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Person Name</Label>
            <Input
              placeholder="e.g. John Smith"
              value={params.fuzzyName?.anyOf?.[0]?.name ?? ""}
              onChange={(e) => {
                const val = e.target.value.trim();
                update("fuzzyName", val ? { anyOf: [{ name: val }] } : null);
              }}
              className="text-sm"
            />
            <p className="text-xs text-muted-foreground">Fuzzy name matching</p>
          </div>
        </FilterSection>

        {/* Exclusion Lists */}
        {(prospectExclOptions.length > 0 || companyExclOptions.length > 0) && (
          <FilterSection title="Exclusion Lists">
            {prospectExclOptions.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Exclude Prospects In</Label>
                <MultiSelect
                  options={prospectExclOptions}
                  selected={selectedProspectExcl}
                  onChange={setSelectedProspectExcl}
                  placeholder="Select prospect exclusion lists..."
                />
              </div>
            )}
            {companyExclOptions.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Exclude Companies In</Label>
                <MultiSelect
                  options={companyExclOptions}
                  selected={selectedCompanyExcl}
                  onChange={setSelectedCompanyExcl}
                  placeholder="Select company exclusion lists..."
                />
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              People matching selected lists will be filtered out of results
            </p>
          </FilterSection>
        )}
      </div>

      {/* Footer */}
      <div className="border-t p-4 space-y-3">
        {/* Count badge */}
        <div className="flex items-center gap-2 text-sm">
          {!hasFilters && (
            <>
              <Hash className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Add filters to see match count</span>
            </>
          )}
          {hasFilters && (count.isLoading || count.isFetching) && (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <span className="text-muted-foreground">Counting matches...</span>
            </>
          )}
          {hasFilters && count.isSuccess && (
            <>
              <Hash className="h-4 w-4 text-primary" />
              <span>
                <span className="font-semibold">
                  {formatNumber(
                    count.data?.output?.totalProfilesFound ?? 0
                  )}
                </span>{" "}
                prospects match
              </span>
            </>
          )}
          {hasFilters && count.isError && (
            <>
              <Hash className="h-4 w-4 text-destructive" />
              <span className="text-destructive">Could not get count</span>
            </>
          )}
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" className="flex-1" onClick={handleReset}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
          <Button type="submit" className="flex-1" disabled={isSearching}>
            {isSearching ? (
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <Search className="mr-2 h-4 w-4" />
            )}
            Search
          </Button>
        </div>
      </div>
    </form>
  );
}
