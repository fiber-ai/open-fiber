import { useState } from "react";
import {
  Download,
  Building2,
  Users,
  CheckCircle,
  Loader2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorDisplay } from "@/components/shared/error-display";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";

type ExportType = "companies" | "prospects";

interface AudienceItem {
  audienceId: string;
  name: string;
  companiesCount?: number;
  prospectsCount?: number;
}

const COMPANY_FORMATS = [
  { value: "COMPANY_GENERIC_CSV", label: "Standard CSV", description: "All company fields" },
  { value: "COMPANY_LI_ADS_CSV", label: "LinkedIn Ads", description: "LinkedIn Ads format" },
] as const;

const PROSPECT_FORMATS = [
  { value: "PROSPECT_GENERIC_CSV", label: "Standard CSV", description: "All prospect fields" },
  { value: "PROSPECT_LI_ADS_CSV", label: "LinkedIn Ads", description: "LinkedIn Ads format" },
  { value: "PROSPECT_GOOGLE_ADS_CSV", label: "Google Ads", description: "Customer Match format" },
  { value: "PROSPECT_META_ADS_CSV", label: "Meta Ads", description: "Custom Audience format" },
] as const;

type CompanyFormat = typeof COMPANY_FORMATS[number]["value"];
type ProspectFormat = typeof PROSPECT_FORMATS[number]["value"];

const COMPANY_FIELDS: { key: string; label: string; group: string }[] = [
  { key: "fiber_id", label: "Fiber ID", group: "Identity" },
  { key: "name", label: "Company Name", group: "Identity" },
  { key: "all_names", label: "All Names", group: "Identity" },
  { key: "website", label: "Website", group: "Identity" },
  { key: "domain", label: "Domain", group: "Identity" },
  { key: "linkedin_url", label: "LinkedIn URL", group: "Identity" },
  { key: "linkedin_org_id", label: "LinkedIn Org ID", group: "Identity" },
  { key: "logo_url", label: "Logo URL", group: "Identity" },
  { key: "headline", label: "Headline", group: "Description" },
  { key: "description", label: "Description", group: "Description" },
  { key: "short_description", label: "Short Description", group: "Description" },
  { key: "long_description", label: "Long Description", group: "Description" },
  { key: "standard_industries", label: "Industries", group: "Classification" },
  { key: "linkedin_industries", label: "LinkedIn Industries", group: "Classification" },
  { key: "crunchbase_categories", label: "Crunchbase Categories", group: "Classification" },
  { key: "crunchbase_category_groups", label: "Crunchbase Category Groups", group: "Classification" },
  { key: "naics_codes", label: "NAICS Codes", group: "Classification" },
  { key: "tags", label: "Tags", group: "Classification" },
  { key: "hq_full_address", label: "HQ Full Address", group: "Location" },
  { key: "hq_street_address", label: "HQ Street", group: "Location" },
  { key: "hq_city", label: "HQ City", group: "Location" },
  { key: "hq_state", label: "HQ State", group: "Location" },
  { key: "hq_country", label: "HQ Country", group: "Location" },
  { key: "hq_country_code", label: "HQ Country Code", group: "Location" },
  { key: "hq_latitude", label: "HQ Latitude", group: "Location" },
  { key: "hq_longitude", label: "HQ Longitude", group: "Location" },
  { key: "num_offices", label: "Number of Offices", group: "Location" },
  { key: "all_office_addresses", label: "All Office Addresses", group: "Location" },
  { key: "office_countries", label: "Office Countries", group: "Location" },
  { key: "employee_count_lower", label: "Employee Count (Lower)", group: "Size" },
  { key: "employee_count_upper", label: "Employee Count (Upper)", group: "Size" },
  { key: "category", label: "Category", group: "Size" },
  { key: "revenue_usd", label: "Revenue (USD)", group: "Financial" },
  { key: "market_cap_usd", label: "Market Cap (USD)", group: "Financial" },
  { key: "funding_stage", label: "Funding Stage", group: "Financial" },
  { key: "total_funding_usd", label: "Total Funding (USD)", group: "Financial" },
  { key: "last_funding_usd", label: "Last Funding (USD)", group: "Financial" },
  { key: "last_funded_at", label: "Last Funded Date", group: "Financial" },
  { key: "funding_rounds", label: "Funding Rounds", group: "Financial" },
  { key: "investors", label: "Investors", group: "Financial" },
  { key: "num_exits", label: "Number of Exits", group: "Financial" },
  { key: "stock_ticker", label: "Stock Ticker", group: "Financial" },
  { key: "accelerators", label: "Accelerators", group: "Financial" },
  { key: "acquisitions", label: "Acquisitions", group: "Financial" },
  { key: "founded_on", label: "Founded Date", group: "Dates" },
  { key: "num_followers", label: "LinkedIn Followers", group: "Social" },
  { key: "phone_numbers", label: "Phone Numbers", group: "Contact" },
  { key: "facebook_urls", label: "Facebook URLs", group: "Social" },
  { key: "x_urls", label: "X / Twitter URLs", group: "Social" },
  { key: "github_usernames", label: "GitHub Usernames", group: "Social" },
  { key: "instagram_urls", label: "Instagram URLs", group: "Social" },
  { key: "youtube_urls", label: "YouTube URLs", group: "Social" },
  { key: "blog_urls", label: "Blog URLs", group: "Social" },
  { key: "wellfound_urls", label: "Wellfound URLs", group: "Social" },
  { key: "specialties", label: "Specialties", group: "Other" },
  { key: "crunchbase_url", label: "Crunchbase URL", group: "Other" },
  { key: "crunchbase_rank", label: "Crunchbase Rank", group: "Other" },
  { key: "roles", label: "Roles", group: "Other" },
  { key: "primary_role", label: "Primary Role", group: "Other" },
  { key: "is_subsidiary", label: "Is Subsidiary", group: "Other" },
  { key: "parent", label: "Parent Company", group: "Other" },
  { key: "job_posting_stats", label: "Job Posting Stats", group: "Other" },
  { key: "matching_job_posting_urls", label: "Matching Job URLs", group: "Other" },
  { key: "matching_job_postings_json", label: "Matching Job JSON", group: "Other" },
  { key: "matching_job_postings_titles", label: "Matching Job Titles", group: "Other" },
  { key: "num_matching_job_postings", label: "Matching Job Count", group: "Other" },
  { key: "num_role_matches", label: "Role Match Count", group: "Other" },
  { key: "custom", label: "Custom Data", group: "Other" },
];

// Group fields
function groupFields(fields: typeof COMPANY_FIELDS) {
  const groups: Record<string, typeof COMPANY_FIELDS> = {};
  for (const f of fields) {
    (groups[f.group] ??= []).push(f);
  }
  return groups;
}

export default function ExportsPage() {
  const [exportType, setExportType] = useState<ExportType>("companies");
  const [selectedAudience, setSelectedAudience] = useState<string | null>(null);
  const [companyFormat, setCompanyFormat] = useState<CompanyFormat>("COMPANY_GENERIC_CSV");
  const [prospectFormat, setProspectFormat] = useState<ProspectFormat>("PROSPECT_GENERIC_CSV");
  const [onlyWithContacts, setOnlyWithContacts] = useState(false);
  const [email, setEmail] = useState("");
  const [excludedFields, setExcludedFields] = useState<Set<string>>(new Set());
  const [showFields, setShowFields] = useState(false);

  const audiences = trpc.audiences.list.useQuery(undefined, { staleTime: 30_000 });
  const audiencesData = audiences.data;
  const audienceItems = audiencesData?.output?.audiences ?? [];

  const exportCompanies = trpc.exports.exportCompanies.useMutation();
  const exportProspects = trpc.exports.exportProspects.useMutation();

  const isExporting = exportCompanies.isPending || exportProspects.isPending;
  const exportResult = exportType === "companies" ? exportCompanies : exportProspects;

  const toggleField = (key: string) => {
    setExcludedFields((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleExport = () => {
    if (!selectedAudience) return;
    const exclArr = Array.from(excludedFields);
    if (exportType === "companies") {
      exportCompanies.mutate({
        audienceId: selectedAudience,
        format: companyFormat,
        excludeFields: exclArr,
        userEmail: email || null,
      });
    } else {
      exportProspects.mutate({
        audienceId: selectedAudience,
        format: prospectFormat,
        excludeFields: exclArr,
        onlyWithContacts,
        userEmail: email || null,
      });
    }
  };

  const resultData = exportResult.data as {
    output?: { message?: string; estimatedRows?: number };
  } | undefined;

  const fieldGroups = groupFields(COMPANY_FIELDS);
  const totalFields = COMPANY_FIELDS.length;

  return (
    <div className="flex h-full flex-col">
      <Header title="Exports" description="Download your data in multiple formats" />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-2xl space-y-6">
          {/* Export Type */}
          <div className="flex gap-2">
            <Button
              variant={exportType === "companies" ? "default" : "outline"}
              onClick={() => { setExportType("companies"); setExcludedFields(new Set()); }}
            >
              <Building2 className="mr-2 h-4 w-4" />
              Export Companies
            </Button>
            <Button
              variant={exportType === "prospects" ? "default" : "outline"}
              onClick={() => { setExportType("prospects"); setExcludedFields(new Set()); }}
            >
              <Users className="mr-2 h-4 w-4" />
              Export Prospects
            </Button>
          </div>

          {/* Audience Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Select Audience</CardTitle>
            </CardHeader>
            <CardContent>
              {audiences.isLoading && <LoadingSkeleton rows={3} />}
              {audiences.isError && <ErrorDisplay message={audiences.error.message} />}
              {audienceItems.length === 0 && audiences.isSuccess && (
                <p className="text-sm text-muted-foreground">
                  No audiences available. Create an audience first from the Audiences page.
                </p>
              )}
              {audienceItems.length > 0 && (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {audienceItems.map((a) => (
                    <button
                      key={a.audienceId}
                      type="button"
                      className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm transition-colors ${
                        selectedAudience === a.audienceId
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted/50"
                      }`}
                      onClick={() => setSelectedAudience(a.audienceId)}
                    >
                      <span className="font-medium">{a.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {a.companiesCount ?? 0} cos · {a.prospectsCount ?? 0} prospects
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Format Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Export Format</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {(exportType === "companies" ? COMPANY_FORMATS : PROSPECT_FORMATS).map(
                  (fmt) => {
                    const isSelected =
                      exportType === "companies"
                        ? companyFormat === fmt.value
                        : prospectFormat === fmt.value;
                    return (
                      <button
                        key={fmt.value}
                        type="button"
                        className={`rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "hover:bg-muted/50"
                        }`}
                        onClick={() => {
                          if (exportType === "companies")
                            setCompanyFormat(fmt.value as CompanyFormat);
                          else setProspectFormat(fmt.value as ProspectFormat);
                        }}
                      >
                        <p className="font-medium">{fmt.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {fmt.description}
                        </p>
                      </button>
                    );
                  }
                )}
              </div>

              {exportType === "prospects" && (
                <label className="mt-3 flex items-center gap-2 text-sm">
                  <Checkbox checked={onlyWithContacts} onCheckedChange={(v) => setOnlyWithContacts(v === true)} />
                  Only export prospects with verified contact info
                </label>
              )}
            </CardContent>
          </Card>

          {/* Field Selection */}
          <Card>
            <CardHeader>
              <button
                type="button"
                className="flex w-full items-center justify-between"
                onClick={() => setShowFields(!showFields)}
              >
                <CardTitle className="text-base">
                  Customize Fields
                  {excludedFields.size > 0 && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {totalFields - excludedFields.size}/{totalFields} included
                    </Badge>
                  )}
                </CardTitle>
                {showFields ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
            </CardHeader>
            {showFields && (
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    type="button" variant="outline" size="sm"
                    onClick={() => setExcludedFields(new Set())}
                  >
                    Include All
                  </Button>
                  <Button
                    type="button" variant="outline" size="sm"
                    onClick={() => setExcludedFields(new Set(COMPANY_FIELDS.map((f) => f.key)))}
                  >
                    Exclude All
                  </Button>
                </div>
                {Object.entries(fieldGroups).map(([group, fields]) => (
                  <div key={group}>
                    <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">{group}</p>
                    <div className="grid grid-cols-2 gap-1">
                      {fields.map((f) => {
                        const isExcluded = excludedFields.has(f.key);
                        return (
                          <label
                            key={f.key}
                            className={`flex items-center gap-2 rounded px-2 py-1 text-xs cursor-pointer transition-colors ${
                              isExcluded ? "text-muted-foreground line-through" : "hover:bg-muted/50"
                            }`}
                          >
                            <Checkbox checked={!isExcluded} onCheckedChange={() => toggleField(f.key)} className="h-3 w-3" />
                            {f.label}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </CardContent>
            )}
          </Card>

          {/* Notification Email */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <Label>Notification Email (optional)</Label>
                <Input
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Get notified when the export is ready for download.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Export Button */}
          <Button
            onClick={handleExport}
            disabled={!selectedAudience || isExporting}
            className="w-full"
            size="lg"
          >
            {isExporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Export {exportType === "companies" ? "Companies" : "Prospects"}
            {excludedFields.size > 0 && (
              <span className="ml-1 text-xs opacity-75">
                ({totalFields - excludedFields.size} fields)
              </span>
            )}
          </Button>

          {/* Success Result */}
          {exportResult.isSuccess && resultData?.output && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="flex items-center gap-3 pt-6">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-900">
                    Export started
                  </p>
                  <p className="text-xs text-green-700">
                    {resultData.output.message ??
                      `Estimated ${resultData.output.estimatedRows ?? "?"} rows`}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {exportResult.isError && (
            <ErrorDisplay message={exportResult.error.message} />
          )}
        </div>
      </div>
    </div>
  );
}
