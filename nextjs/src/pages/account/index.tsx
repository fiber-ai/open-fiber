import { CreditCard, ExternalLink, Calendar, TrendingUp, AlertTriangle, Settings } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { ErrorDisplay } from "@/components/shared/error-display";
import { formatNumber } from "@/lib/utils";

interface OperationLevel {
  limit?: number | null;
  centiCreditCost: number;
}

interface CreditsPerOperation {
  [key: string]: { levels: OperationLevel[] } | undefined;
}

interface CreditsOutput {
  organizationId: string;
  max: number;
  used: number;
  available: number;
  usagePeriodResetsOn: string;
  creditsPerOperation?: CreditsPerOperation;
}

const OPERATION_LABELS: Record<string, string> = {
  getCompanyFromDb: "Company Search",
  getPersonFromDb: "Prospect Search",
  getCompanyCountFromDb: "Company Count",
  getPersonCountFromDb: "Prospect Count",
  getJobPostingFromDb: "Job Posting Search",
  getJobPostingCountFromDb: "Job Posting Count",
  getInvestorFromDb: "Investor Search",
  getInvestmentFromDb: "Investment Search",
  textToCompanySearchParams: "AI Company Search",
  textToPersonSearchParams: "AI Prospect Search",
  liveEnrichCompany: "Live Enrich Company",
  liveEnrichPerson: "Live Enrich Person",
  liveEnrichPersonForContactReveal: "Live Enrich + Contact Reveal",
  workEmailReveal: "Work Email Reveal",
  personalEmailReveal: "Personal Email Reveal",
  allEmailReveal: "All Email Reveal",
  phoneReveal: "Phone Number Reveal",
  combinedReveal: "All Contact Data Reveal",
  validateEmail: "Email Validation",
  validatePhone: "Phone Validation",
  emailToLinkedinUrl: "Email → LinkedIn Lookup",
  kitchenSinkPerson: "Full Person Lookup",
  kitchenSinkCompany: "Full Company Lookup",
  googleMapsScrape: "Google Maps Scrape",
  domainLookupAgent: "Domain Lookup (AI)",
  combinedEnrichment: "Combined Enrichment",
  standardizeCompanySlug: "Company Slug Fixup",
  standardizePersonSlug: "Person Slug Fixup",
  salesNavCompanyScrape: "Sales Nav Company",
  salesNavPersonScrape: "Sales Nav Person",
  geolocation: "Geolocation",
  localBusinessResearchAgent: "Local Business Research",
};

function getCreditCost(op: { levels: OperationLevel[] }): string {
  const centi = op.levels[0]?.centiCreditCost ?? 0;
  const credits = centi / 100;
  return credits % 1 === 0 ? credits.toString() : credits.toFixed(2);
}

export default function AccountPage() {
  const credits = trpc.utility.getCredits.useQuery(undefined, {
    staleTime: 10_000,
  });

  const data = credits.data;
  const output = data?.output;

  return (
    <div className="flex h-full flex-col">
      <Header title="Usage & Credits" description="Monitor your credit balance and usage" />

      <div className="flex-1 overflow-y-auto p-6">
        {credits.isLoading && <LoadingSkeleton rows={4} />}
        {credits.isError && (
          <ErrorDisplay
            message={credits.error.message}
            onRetry={() => credits.refetch()}
          />
        )}

        {output && (
          <div className="mx-auto max-w-4xl space-y-6">
            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Available
                  </CardTitle>
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p data-testid="credits-available" className="text-3xl font-bold">{formatNumber(output.available)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    of {formatNumber(output.max)} total
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Used
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p data-testid="credits-used" className="text-3xl font-bold">{formatNumber(output.used)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {output.max > 0
                      ? `${Math.round((output.used / output.max) * 100)}% of plan`
                      : "—"}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Resets On
                  </CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p data-testid="credits-resets-on" className="text-xl font-bold">
                    {new Date(output.usagePeriodResetsOn).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Usage Bar */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="font-medium">Credit Usage</span>
                  <span className="text-muted-foreground">
                    {formatNumber(output.used)} / {formatNumber(output.max)}
                  </span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary transition-all duration-500"
                    style={{
                      width: `${output.max > 0 ? Math.min((output.used / output.max) * 100, 100) : 0}%`,
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Low credit warning */}
            {output.available < output.max * 0.1 && output.max > 0 && (
              <Card className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
                <CardContent className="pt-6 flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Credits running low</p>
                    <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                      You have {formatNumber(output.available)} credits remaining ({Math.round((output.available / output.max) * 100)}% of plan).{" "}
                      <a href="https://fiber.ai/app/api" target="_blank" rel="noopener noreferrer" className="underline">
                        Add more credits
                      </a>
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Credit Costs Per Operation */}
            {output.creditsPerOperation && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Credit Costs by Operation</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="px-4 py-2 text-left font-medium">Operation</th>
                          <th className="px-4 py-2 text-right font-medium">Credits</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(output.creditsPerOperation)
                          .filter(([, v]) => v && v.levels.length > 0)
                          .sort(([a], [b]) => {
                            const labelA = OPERATION_LABELS[a] ?? a;
                            const labelB = OPERATION_LABELS[b] ?? b;
                            return labelA.localeCompare(labelB);
                          })
                          .map(([key, value]) => (
                            <tr key={key} className="border-b">
                              <td className="px-4 py-2">
                                {OPERATION_LABELS[key] ?? key}
                              </td>
                              <td className="px-4 py-2 text-right">
                                <Badge variant="secondary" className="text-xs font-mono">
                                  {getCreditCost(value!)}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Billing Settings */}
            <BillingSettings />

            {/* Manage Link */}
            <div className="flex justify-center">
              <a
                href="https://fiber.ai/app/api"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Manage API Key & Billing on Fiber
                </Button>
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Billing settings sub-component.
 * Fetches and displays auto top-up configuration.
 * Gracefully handles 404/403 if the endpoint isn't available for this org.
 */
function BillingSettings() {
  const autoTopUp = trpc.utility.getAutoTopUp.useQuery(undefined, {
    retry: false,
    staleTime: 30_000,
  });

  // If the endpoint fails (not available for this org), just don't show the section
  if (autoTopUp.isError || autoTopUp.isLoading) return null;

  const settings = autoTopUp.data?.output;
  if (!settings || settings.configured === false) return null;

  const isEnabled = (settings.isEnabled as boolean) ?? false;
  const threshold = (settings.creditThreshold as number) ?? 0;
  const amount = (settings.creditsToBuy as number) ?? 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Auto Top-Up
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm">Status</span>
          <Badge variant={isEnabled ? "default" : "secondary"}>
            {isEnabled ? "Enabled" : "Disabled"}
          </Badge>
        </div>
        {isEnabled && (
          <>
            <Separator />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Top up when balance drops below</span>
              <span className="font-mono">{formatNumber(threshold)} credits</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Top up amount</span>
              <span className="font-mono">{formatNumber(amount)} credits</span>
            </div>
          </>
        )}
        <p className="text-xs text-muted-foreground">
          Manage auto top-up settings on{" "}
          <a href="https://fiber.ai/app/api" target="_blank" rel="noopener noreferrer" className="text-primary underline">
            fiber.ai
          </a>
        </p>
      </CardContent>
    </Card>
  );
}
