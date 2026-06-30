import { useState } from "react";
import { ChevronDown, ChevronRight, Search, RotateCcw } from "lucide-react";
import { stripEmpty } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MultiSelect } from "@/components/shared/multi-select";
import { RangeInput } from "@/components/shared/range-input";
import { SearchCountBadge } from "./search-count-badge";
import { trpc } from "@/lib/trpc";
import type { CompanySearchParams } from "@/lib/schemas/search";
import {
  industry,
  FUNDING_STAGE_LABELS,
  EMPLOYEE_COUNT_LABELS,
  ACCELERATOR_LABELS,
  companyTag,
  companyStatus,
} from "@/lib/schemas/search";

interface CompanySearchFormProps {
  onSearch: (params: CompanySearchParams, exclusionListIDs?: string[]) => void;
  isSearching: boolean;
}

const INDUSTRY_OPTIONS = industry.options.map((v) => ({ value: v, label: v }));

const FUNDING_STAGE_OPTIONS = Object.entries(FUNDING_STAGE_LABELS).map(
  ([value, label]) => ({ value, label })
);

const EMPLOYEE_BUCKETS = [
  { lower: null, upper: 1, label: "1" },
  { lower: 1, upper: 10, label: "2-10" },
  { lower: 10, upper: 50, label: "11-50" },
  { lower: 50, upper: 200, label: "51-200" },
  { lower: 200, upper: 500, label: "201-500" },
  { lower: 500, upper: 1000, label: "501-1K" },
  { lower: 1000, upper: 5000, label: "1K-5K" },
  { lower: 5000, upper: 10000, label: "5K-10K" },
  { lower: 10000, upper: null, label: "10K+" },
];

const ACCELERATOR_OPTIONS = Object.entries(ACCELERATOR_LABELS).map(
  ([value, label]) => ({ value, label })
);

const TAG_OPTIONS = companyTag.options.map((v) => ({
  value: v,
  label: v.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
}));

const STATUS_OPTIONS = companyStatus.options.map((v) => ({
  value: v,
  label: v.charAt(0).toUpperCase() + v.slice(1),
}));

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

interface ExclusionList { listID: string; name: string }

export function CompanySearchForm({ onSearch, isSearching }: CompanySearchFormProps) {
  const [params, setParams] = useState<CompanySearchParams>({});
  const [selectedExclusionLists, setSelectedExclusionLists] = useState<string[]>([]);

  // Local state for text inputs to prevent comma/space eating
  const [countryInput, setCountryInput] = useState("");
  const [stateInput, setStateInput] = useState("");
  const [keywordsInput, setKeywordsInput] = useState("");
  const [techInput, setTechInput] = useState("");

  const exclusionLists = trpc.exclusionLists.listCompanyLists.useQuery(undefined, { staleTime: 60_000 });
  const exclData = exclusionLists.data;
  const exclOptions = (exclData?.output ?? []).map((l) => ({ value: l.listID, label: l.name }));

  const update = <K extends keyof CompanySearchParams>(
    key: K,
    value: CompanySearchParams[K]
  ) => {
    setParams((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(stripEmpty(params), selectedExclusionLists.length > 0 ? selectedExclusionLists : undefined);
  };

  const handleReset = () => {
    setParams({});
    setCountryInput("");
    setStateInput("");
    setKeywordsInput("");
    setTechInput("");
    setSelectedExclusionLists([]);
  };

  // Selected employee bucket state (simplified UI with multi-select checkboxes)
  const [empMin, setEmpMin] = useState<number | null>(null);
  const [empMax, setEmpMax] = useState<number | null>(null);

  const handleEmpBucket = (lower: number | null, upper: number | null) => {
    setEmpMin(lower);
    setEmpMax(upper);
    update("employeeCountV2", {
      lowerBoundExclusive: lower,
      upperBoundInclusive: upper,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto">
        {/* Company Identity */}
        <FilterSection title="Company Identity" defaultOpen>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Company Name</Label>
            <Input
              placeholder="Search by name..."
              value={params.nameLike?.anyOf?.[0] ?? ""}
              onChange={(e) => {
                const val = e.target.value;
                update("nameLike", val ? { anyOf: [val] } : null);
              }}
              className="text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Domain</Label>
            <Input
              placeholder="e.g. stripe.com"
              value={params.domains?.[0] ?? ""}
              onChange={(e) => {
                const val = e.target.value;
                update("domains", val ? [val] : null);
              }}
              className="text-sm"
            />
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
                update("headquartersCountryCode", codes.length ? { anyOf: codes } : null);
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
                update("headquartersStateName", states.length ? { anyOf: states } : null);
              }}
              className="text-sm"
            />
          </div>
        </FilterSection>

        {/* Size & Stage */}
        <FilterSection title="Size & Stage">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Employee Count</Label>
            <div className="flex flex-wrap gap-1">
              {EMPLOYEE_BUCKETS.map((bucket) => {
                const isActive =
                  empMin === bucket.lower && empMax === bucket.upper;
                return (
                  <button
                    key={bucket.label}
                    type="button"
                    className={`rounded-md border px-2 py-1 text-xs transition-colors ${
                      isActive
                        ? "border-primary bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    }`}
                    onClick={() =>
                      isActive
                        ? handleEmpBucket(null, null)
                        : handleEmpBucket(bucket.lower, bucket.upper)
                    }
                  >
                    {bucket.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Funding Stage</Label>
            <MultiSelect
              options={FUNDING_STAGE_OPTIONS}
              selected={params.stage?.anyOf ?? []}
              onChange={(val) =>
                update("stage", val.length ? { anyOf: val as never[] } : null)
              }
              placeholder="Select funding stages..."
            />
          </div>
          <RangeInput
            label="Total Funding (USD)"
            min={params.totalFundingUSD?.lowerBound}
            max={params.totalFundingUSD?.upperBound}
            onMinChange={(v) =>
              update("totalFundingUSD", { ...params.totalFundingUSD, lowerBound: v })
            }
            onMaxChange={(v) =>
              update("totalFundingUSD", { ...params.totalFundingUSD, upperBound: v })
            }
            formatPrefix="$"
          />
          <RangeInput
            label="Last Funding Round (USD)"
            min={params.lastFundingUSD?.lowerBound}
            max={params.lastFundingUSD?.upperBound}
            onMinChange={(v) =>
              update("lastFundingUSD", { ...params.lastFundingUSD, lowerBound: v })
            }
            onMaxChange={(v) =>
              update("lastFundingUSD", { ...params.lastFundingUSD, upperBound: v })
            }
            formatPrefix="$"
          />
        </FilterSection>

        {/* Industry & Keywords */}
        <FilterSection title="Industry & Keywords">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Industries</Label>
            <MultiSelect
              options={INDUSTRY_OPTIONS}
              selected={params.industriesV2?.anyOf ?? []}
              onChange={(val) =>
                update("industriesV2", val.length ? { anyOf: val as never[] } : null)
              }
              placeholder="Select industries..."
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Keywords</Label>
            <Input
              placeholder="e.g. AI, machine learning, SaaS"
              value={keywordsInput}
              onChange={(e) => {
                setKeywordsInput(e.target.value);
                const kws = e.target.value.split(",").map((s) => s.trim()).filter(Boolean);
                update("keywords", kws.length ? { containsAny: kws } : null);
              }}
              className="text-sm"
            />
            <p className="text-xs text-muted-foreground">Comma-separated keywords</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Tags</Label>
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

        {/* Accelerators */}
        <FilterSection title="Accelerators">
          <MultiSelect
            options={ACCELERATOR_OPTIONS}
            selected={
              params.acceleratorsV2?.anyOf?.map(
                (a) => (a as { acceleratorName: string }).acceleratorName
              ) ?? []
            }
            onChange={(val) =>
              update(
                "acceleratorsV2",
                val.length
                  ? {
                      anyOf: val.map((v) => ({
                        acceleratorName: v as never,
                        batchSelection: null,
                        years: null,
                      })),
                    }
                  : null
              )
            }
            placeholder="Select accelerators..."
          />
        </FilterSection>

        {/* Technologies */}
        <FilterSection title="Tech Stack">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Technologies</Label>
            <Input
              placeholder="e.g. React, Python, AWS"
              value={techInput}
              onChange={(e) => {
                setTechInput(e.target.value);
                const techs = e.target.value.split(",").map((s) => s.trim()).filter(Boolean);
                update(
                  "technologies",
                  techs.length
                    ? {
                        anyOf: techs.map((t) => ({
                          type: "custom" as const,
                          name: t,
                        })),
                      }
                    : null
                );
              }}
              className="text-sm"
            />
            <p className="text-xs text-muted-foreground">Comma-separated technology names</p>
          </div>
        </FilterSection>

        {/* Status */}
        <FilterSection title="Company Status">
          <MultiSelect
            options={STATUS_OPTIONS}
            selected={params.status?.anyOf ?? []}
            onChange={(val) =>
              update("status", val.length ? { anyOf: val as never[] } : null)
            }
            placeholder="Select status..."
          />
        </FilterSection>

        {/* Revenue */}
        <FilterSection title="Revenue">
          <RangeInput
            label="Annual Revenue (USD)"
            min={
              params.revenueUSD?.min
                ? params.revenueUSD.min.quantity *
                  (params.revenueUSD.min.suffix === "K"
                    ? 1000
                    : params.revenueUSD.min.suffix === "M"
                    ? 1000000
                    : params.revenueUSD.min.suffix === "B"
                    ? 1000000000
                    : 1)
                : null
            }
            max={
              params.revenueUSD?.max
                ? params.revenueUSD.max.quantity *
                  (params.revenueUSD.max.suffix === "K"
                    ? 1000
                    : params.revenueUSD.max.suffix === "M"
                    ? 1000000
                    : params.revenueUSD.max.suffix === "B"
                    ? 1000000000
                    : 1)
                : null
            }
            onMinChange={(v) => {
              if (v === null) {
                update("revenueUSD", { ...params.revenueUSD, min: null });
              } else {
                const { quantity, suffix } = toRevenueSuffix(v);
                update("revenueUSD", {
                  ...params.revenueUSD,
                  min: { quantity, suffix },
                });
              }
            }}
            onMaxChange={(v) => {
              if (v === null) {
                update("revenueUSD", { ...params.revenueUSD, max: null });
              } else {
                const { quantity, suffix } = toRevenueSuffix(v);
                update("revenueUSD", {
                  ...params.revenueUSD,
                  max: { quantity, suffix },
                });
              }
            }}
            formatPrefix="$"
          />
        </FilterSection>

        {/* Exclusion Lists */}
        {exclOptions.length > 0 && (
          <FilterSection title="Exclusion Lists">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Exclude Companies In</Label>
              <MultiSelect
                options={exclOptions}
                selected={selectedExclusionLists}
                onChange={setSelectedExclusionLists}
                placeholder="Select exclusion lists..."
              />
              <p className="text-xs text-muted-foreground">
                Companies in selected lists will be filtered out of results
              </p>
            </div>
          </FilterSection>
        )}
      </div>

      {/* Footer */}
      <div className="border-t p-4 space-y-3">
        <SearchCountBadge searchParams={stripEmpty(params)} />
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={handleReset}
          >
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

function toRevenueSuffix(value: number): {
  quantity: number;
  suffix: "K" | "M" | "B" | "T" | null;
} {
  if (value >= 1_000_000_000_000)
    return { quantity: value / 1_000_000_000_000, suffix: "T" };
  if (value >= 1_000_000_000)
    return { quantity: value / 1_000_000_000, suffix: "B" };
  if (value >= 1_000_000)
    return { quantity: value / 1_000_000, suffix: "M" };
  if (value >= 1_000) return { quantity: value / 1_000, suffix: "K" };
  return { quantity: value, suffix: null };
}
