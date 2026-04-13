import { Upload, ExternalLink } from "lucide-react";
import { z } from "zod";
import { trpc } from "@/lib/trpc";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorDisplay } from "@/components/shared/error-display";
import { CsvImporter, type CsvColumnConfig, type CsvImporterResult } from "@/components/shared/csv-importer";

/** Schema for each row — at least one identifier must be present. */
const companyRowSchema = z.object({
  domain: z.string().optional(),
  name: z.string().optional(),
  linkedinUrl: z.string().optional(),
}).refine(
  (row) => row.domain || row.name || row.linkedinUrl,
  { message: "At least one of domain, name, or LinkedIn URL is required" }
);

type CompanyRow = z.infer<typeof companyRowSchema>;

const COLUMNS: CsvColumnConfig[] = [
  { key: "domain", label: "Domain", aliases: ["website", "url", "site"] },
  { key: "name", label: "Company Name", aliases: ["company", "company_name", "companyname", "org"] },
  { key: "linkedinUrl", label: "LinkedIn URL", aliases: ["linkedin", "li_url", "linkedin_url"] },
];

export default function CompanyImportPage() {
  const bulkMutation = trpc.linkedin.kitchenSinkBulkCompany.useMutation();

  const handleComplete = (result: CsvImporterResult<CompanyRow>) => {
    bulkMutation.mutate({
      companies: result.validRows.map((c) => ({
        ...(c.linkedinUrl
          ? { companyIdentifier: { identifier: "linkedinUrl" as const, value: c.linkedinUrl } }
          : {}),
        ...(c.name ? { companyName: { value: c.name } } : {}),
        ...(c.domain ? { companyDomain: { value: c.domain } } : {}),
      })),
    });
  };

  const results = bulkMutation.data?.output;
  const resultCompanies = (
    results && typeof results === "object" && "companies" in results
      ? (results.companies as Record<string, unknown>[])
      : results && typeof results === "object" && "results" in results
      ? (results.results as Record<string, unknown>[])
      : null
  );

  return (
    <div className="flex h-full flex-col">
      <Header title="Company Import" description="Upload a CSV of companies to match against Fiber's database" />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-3xl space-y-6">
          {!bulkMutation.isSuccess && (
            <CsvImporter
              schema={companyRowSchema}
              columns={COLUMNS}
              onComplete={handleComplete}
              confirmLabel="Match Companies"
              isLoading={bulkMutation.isPending}
            />
          )}

          {bulkMutation.isError && <ErrorDisplay message={bulkMutation.error.message} />}

          {bulkMutation.isSuccess && resultCompanies && resultCompanies.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Matched Companies
                  <Badge variant="secondary" className="ml-2">{resultCompanies.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-4 py-2 text-left font-medium">Company</th>
                        <th className="px-4 py-2 text-left font-medium">Domain</th>
                        <th className="px-4 py-2 text-left font-medium">Industry</th>
                        <th className="px-4 py-2 text-left font-medium">LinkedIn</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultCompanies.map((c, i) => (
                        <tr key={i} className="border-b">
                          <td className="px-4 py-2 font-medium">
                            {(c.name as string) ?? (c.preferred_name as string) ?? "—"}
                          </td>
                          <td className="px-4 py-2 text-muted-foreground font-mono text-xs">
                            {(c.domain as string) ?? ((c.domains as string[])?.[0]) ?? "—"}
                          </td>
                          <td className="px-4 py-2 text-muted-foreground text-xs">
                            {(c.industry as string) ?? "—"}
                          </td>
                          <td className="px-4 py-2">
                            {(c.linkedinUrl as string) ? (
                              <a href={c.linkedinUrl as string} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            ) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {bulkMutation.isSuccess && (!resultCompanies || resultCompanies.length === 0) && (
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Lookup complete. Check the raw response below.</p>
                <pre className="mt-2 text-xs overflow-x-auto bg-muted p-4 rounded-md max-h-64">
                  {JSON.stringify(results, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}

          {!bulkMutation.isSuccess && !bulkMutation.isPending && (
            <EmptyState icon={Upload} title="Company Import" description="Upload a CSV with company names, domains, or LinkedIn URLs to match them in Fiber's database." />
          )}
        </div>
      </div>
    </div>
  );
}
