import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { z } from "zod";
import { ArrowLeft, Plus, Trash2, Loader2, ShieldCheck } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorDisplay } from "@/components/shared/error-display";
import { CsvImporter, type CsvColumnConfig } from "@/components/shared/csv-importer";

const companyExclSchema = z.object({
  domain: z.string().optional(),
  linkedinUrl: z.string().optional(),
}).refine((r) => r.domain || r.linkedinUrl, { message: "Need domain or LinkedIn URL" });

const prospectExclSchema = z.object({
  linkedinUrl: z.string().min(1, "LinkedIn URL is required"),
});

const COMPANY_EXCL_COLUMNS: CsvColumnConfig[] = [
  { key: "domain", label: "Domain", aliases: ["website", "url", "site"] },
  { key: "linkedinUrl", label: "LinkedIn URL", aliases: ["linkedin", "li_url"] },
];

const PROSPECT_EXCL_COLUMNS: CsvColumnConfig[] = [
  { key: "linkedinUrl", label: "LinkedIn URL", aliases: ["linkedin", "url", "profile", "li_url"], required: true },
];

interface ExcludedItem {
  id?: string;
  domain?: string | null;
  linkedInUrl?: string | null;
  linkedinUrl?: string | null;
  name?: string | null;
}

export default function ExclusionListDetailPage() {
  const router = useRouter();
  const id = router.query.id as string;
  const listType = (router.query.type as string) === "prospect" ? "prospect" : "company";
  const utils = trpc.useUtils();
  const [pageSize] = useState(25);
  const [input, setInput] = useState("");
  const [showCsvUpload, setShowCsvUpload] = useState(false);

  // Company queries
  const companyQuery = trpc.exclusionLists.getExcludedCompanies.useQuery(
    { exclusionListId: id, pageSize },
    { enabled: !!id && listType === "company" }
  );
  const addCompanyMutation = trpc.exclusionLists.addCompanies.useMutation({
    onSuccess: () => { utils.exclusionLists.getExcludedCompanies.invalidate({ exclusionListId: id }); setInput(""); },
  });
  const removeCompanyMutation = trpc.exclusionLists.removeCompany.useMutation({
    onSuccess: () => utils.exclusionLists.getExcludedCompanies.invalidate({ exclusionListId: id }),
  });

  // Prospect queries
  const prospectQuery = trpc.exclusionLists.getExcludedProspects.useQuery(
    { exclusionListId: id, pageSize },
    { enabled: !!id && listType === "prospect" }
  );
  const addProspectMutation = trpc.exclusionLists.addProspects.useMutation({
    onSuccess: () => { utils.exclusionLists.getExcludedProspects.invalidate({ exclusionListId: id }); setInput(""); },
  });
  const removeProspectMutation = trpc.exclusionLists.removeProspect.useMutation({
    onSuccess: () => utils.exclusionLists.getExcludedProspects.invalidate({ exclusionListId: id }),
  });

  // Unified state
  const activeQuery = listType === "company" ? companyQuery : prospectQuery;
  const isAddPending = addCompanyMutation.isPending || addProspectMutation.isPending;
  const isRemovePending = removeCompanyMutation.isPending || removeProspectMutation.isPending;

  const queryData = activeQuery.data as {
    output?: { companies?: ExcludedItem[]; data?: ExcludedItem[]; hasMore?: boolean };
  } | undefined;
  const items = queryData?.output?.companies ?? queryData?.output?.data ?? [];

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const values = input.split(",").map((s) => s.trim()).filter(Boolean);
    if (values.length === 0) return;

    if (listType === "company") {
      addCompanyMutation.mutate({
        listId: id,
        companies: values.map((v) => ({
          domain: v.includes("linkedin.com") ? null : v,
          linkedinUrl: v.includes("linkedin.com") ? v : null,
        })),
      });
    } else {
      addProspectMutation.mutate({
        listId: id,
        prospects: values.map((v) => ({ linkedinUrl: v })),
      });
    }
  };

  const handleRemove = (item: ExcludedItem) => {
    if (listType === "company") {
      const details: { domains?: string[]; linkedinUrls?: string[] } = {};
      if (item.domain) details.domains = [item.domain];
      const liUrl = item.linkedInUrl ?? item.linkedinUrl;
      if (liUrl) details.linkedinUrls = [liUrl];
      removeCompanyMutation.mutate({ listId: id, ...details });
    } else {
      const liUrl = item.linkedInUrl ?? item.linkedinUrl;
      removeProspectMutation.mutate({ listId: id, linkedinUrls: liUrl ? [liUrl] : [] });
    }
  };

  if (!id) return null;

  const isCompany = listType === "company";
  const entityLabel = isCompany ? "companies" : "prospects";

  return (
    <div className="flex h-full flex-col">
      <Header
        title={`${isCompany ? "Company" : "Prospect"} Exclusion List`}
        description={`Manage excluded ${entityLabel}`}
      >
        <Link href="/exclusion-lists">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
        </Link>
      </Header>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-3xl space-y-6">
          <Card>
            <CardContent className="pt-6">
              <form onSubmit={handleAdd} className="space-y-3">
                <Label>Add {isCompany ? "Companies" : "Prospects"}</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder={isCompany ? "Domains or LinkedIn URLs (comma-separated)" : "LinkedIn profile URLs (comma-separated)"}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="flex-1"
                  />
                  <Button type="submit" disabled={!input.trim() || isAddPending}>
                    {isAddPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                    Add
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {isCompany
                    ? "e.g. stripe.com, google.com, https://linkedin.com/company/meta"
                    : "e.g. https://linkedin.com/in/johndoe, https://linkedin.com/in/janedoe"}
                </p>
              </form>
            </CardContent>
          </Card>

          {/* CSV Upload */}
          <div className="space-y-2">
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground underline"
              onClick={() => setShowCsvUpload((v) => !v)}
            >
              {showCsvUpload ? "Hide" : "Or upload"} a CSV file
            </button>
            {showCsvUpload && (
              <Card>
                <CardContent className="pt-6">
                  <CsvImporter
                    schema={isCompany ? companyExclSchema : prospectExclSchema}
                    columns={isCompany ? COMPANY_EXCL_COLUMNS : PROSPECT_EXCL_COLUMNS}
                    confirmLabel={`Add to Exclusion List`}
                    isLoading={isAddPending}
                    onComplete={(result) => {
                      if (isCompany) {
                        const rows = result.validRows as Array<{ domain?: string; linkedinUrl?: string }>;
                        addCompanyMutation.mutate({
                          listId: id,
                          companies: rows.map((r) => ({
                            domain: r.domain ?? null,
                            linkedinUrl: r.linkedinUrl ?? null,
                          })),
                        });
                      } else {
                        const rows = result.validRows as Array<{ linkedinUrl: string }>;
                        addProspectMutation.mutate({
                          listId: id,
                          prospects: rows.map((r) => ({ linkedinUrl: r.linkedinUrl })),
                        });
                      }
                      setShowCsvUpload(false);
                    }}
                  />
                </CardContent>
              </Card>
            )}
          </div>

          {activeQuery.isLoading && <LoadingSkeleton rows={5} />}
          {activeQuery.isError && <ErrorDisplay message={activeQuery.error.message} onRetry={() => activeQuery.refetch()} />}

          {items.length === 0 && activeQuery.isSuccess && (
            <EmptyState icon={ShieldCheck} title={`No excluded ${entityLabel}`} description={`Add ${isCompany ? "domains or LinkedIn URLs" : "LinkedIn profile URLs"} above.`} />
          )}

          {items.length > 0 && (
            <div className="rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    {isCompany && <th className="px-4 py-2 text-left font-medium">Name</th>}
                    {isCompany && <th className="px-4 py-2 text-left font-medium">Domain</th>}
                    <th className="px-4 py-2 text-left font-medium">LinkedIn</th>
                    <th className="px-4 py-2 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => (
                    <tr key={item.id ?? i} className="border-b">
                      {isCompany && <td className="px-4 py-2 font-medium">{item.name ?? "-"}</td>}
                      {isCompany && <td className="px-4 py-2 text-muted-foreground font-mono text-xs">{item.domain ?? "-"}</td>}
                      <td className="px-4 py-2 text-muted-foreground text-xs truncate max-w-[300px]">
                        {item.linkedInUrl ?? item.linkedinUrl ?? "-"}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemove(item)}
                          disabled={isRemovePending}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
