import { useState } from "react";
import { CreditCard, ExternalLink, Calendar, TrendingUp, AlertTriangle, Settings, KeyRound, Loader2, RotateCcw, Ban } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { ErrorDisplay } from "@/components/shared/error-display";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
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
  financialInstrumentLookup: "Finance Instrument Lookup",
  talentFlow: "Talent Flow",
  emailToLinkedinMiss: "Email → LinkedIn (Miss)",
  leadListFromDomain: "Lead List from Domain",
  fetchCompanyEmployee: "Fetch Company Employees",
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
  const pricedOperations = Object.entries(output?.creditsPerOperation ?? {})
    .filter(([, v]) => v && v.levels.length > 0)
    .sort(([a], [b]) => (OPERATION_LABELS[a] ?? a).localeCompare(OPERATION_LABELS[b] ?? b));

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

            {/* Credit Costs Per Operation — hidden entirely when no operation has pricing */}
            {pricedOperations.length > 0 && (
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
                        {pricedOperations.map(([key, value]) => (
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

            {/* API Key Management */}
            <ApiKeysSection />

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

/**
 * Expiration is date-grained: the picker's YYYY-MM-DD is stored as end-of-day
 * UTC and displayed by UTC date parts, so the day the user picks is the day
 * shown back — a local-time Date parse would shift it a day in most timezones.
 */
function formatExpirationDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { timeZone: "UTC" });
}

/**
 * API key management. All actions target the key this session is authenticated
 * with (SELF); other keys are listed read-only. Gracefully hides itself if the
 * API-keys endpoints aren't available for this org.
 */
function ApiKeysSection() {
  const utils = trpc.useUtils();
  const currentKey = trpc.apiKeys.getCurrent.useQuery(undefined, { retry: false, staleTime: 30_000 });
  const allKeys = trpc.apiKeys.getAll.useQuery({ includeRevoked: false }, { retry: false, staleTime: 30_000 });

  const invalidate = () => {
    utils.apiKeys.invalidate();
  };
  const resetUsage = trpc.apiKeys.resetUsage.useMutation({ onSuccess: invalidate });
  const revoke = trpc.apiKeys.revokeCurrent.useMutation({ onSuccess: invalidate });
  const updateLimit = trpc.apiKeys.updateLimit.useMutation({ onSuccess: invalidate });
  const updateExpiration = trpc.apiKeys.updateExpiration.useMutation({ onSuccess: invalidate });

  const [limitInput, setLimitInput] = useState("");
  const [expiresInput, setExpiresInput] = useState("");

  if (currentKey.isError || currentKey.isLoading) return null;
  const key = currentKey.data?.output;
  if (!key) return null;

  const keys = allKeys.data?.output.apiKeys ?? [];
  const anyMutationPending = resetUsage.isPending || revoke.isPending || updateLimit.isPending || updateExpiration.isPending;
  const mutationError = resetUsage.error ?? revoke.error ?? updateLimit.error ?? updateExpiration.error;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <KeyRound className="h-4 w-4" />
          API Keys
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current key */}
        <div className="rounded-md border p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">{key.name}</span>
            <Badge variant="outline" className="font-mono text-xs">{key.prefix}…</Badge>
            <Badge variant="secondary" className="text-xs">current key</Badge>
            {key.isRevoked && <Badge variant="destructive" className="text-xs">revoked</Badge>}
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">Key usage</span>
              <span className="text-muted-foreground tabular-nums">
                {formatNumber(key.creditsUsed)}{key.maxCredits != null && <> / {formatNumber(key.maxCredits)}</>} credits
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all duration-500"
                style={{
                  width: key.maxCredits != null && key.maxCredits > 0
                    ? `${Math.min((key.creditsUsed / key.maxCredits) * 100, 100)}%`
                    : "0%",
                }}
              />
            </div>
            {key.maxCredits == null && (
              <p className="text-xs text-muted-foreground">No credit limit set on this key</p>
            )}
          </div>

          <div className="flex flex-wrap gap-x-8 gap-y-1">
            <div>
              <p className="text-xs text-muted-foreground">Expires</p>
              <p className="text-sm">{key.expiresAt ? formatExpirationDate(key.expiresAt) : "Never"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Created</p>
              <p className="text-sm">{new Date(key.createdAt).toLocaleDateString()}</p>
            </div>
          </div>

          <Separator />

          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Credit limit</Label>
              <div className="flex gap-2">
                <Input
                  className="w-32" type="number" min={0}
                  placeholder={key.maxCredits != null ? String(key.maxCredits) : "none"}
                  value={limitInput}
                  onChange={(e) => setLimitInput(e.target.value)}
                />
                <Button
                  variant="outline" size="sm"
                  disabled={!limitInput || anyMutationPending}
                  onClick={() => { updateLimit.mutate({ operation: "set", credits: Number(limitInput) }); setLimitInput(""); }}
                >
                  Set
                </Button>
                {key.maxCredits != null && (
                  <Button
                    variant="ghost" size="sm" disabled={anyMutationPending}
                    onClick={() => updateLimit.mutate({ operation: "remove" })}
                  >
                    Remove
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Expiration</Label>
              <div className="flex gap-2">
                <Input
                  className="w-40" type="date"
                  value={expiresInput}
                  onChange={(e) => setExpiresInput(e.target.value)}
                />
                <Button
                  variant="outline" size="sm"
                  disabled={!expiresInput || anyMutationPending}
                  onClick={() => { updateExpiration.mutate({ operation: "set", expiresAt: `${expiresInput}T23:59:59.999Z` }); setExpiresInput(""); }}
                >
                  Set
                </Button>
                {key.expiresAt && (
                  <Button
                    variant="ghost" size="sm" disabled={anyMutationPending}
                    onClick={() => updateExpiration.mutate({ operation: "remove" })}
                  >
                    Remove
                  </Button>
                )}
              </div>
            </div>
          </div>

          <Separator />

          <div className="flex flex-wrap gap-2">
            <ConfirmDialog
              trigger={
                <Button variant="outline" size="sm" disabled={anyMutationPending}>
                  {resetUsage.isPending ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <RotateCcw className="mr-2 h-3 w-3" />}
                  Reset usage counter
                </Button>
              }
              title="Reset usage counter?"
              description="Resets this key's credits-used counter to zero. This does not refund credits at the organization level."
              confirmLabel="Reset"
              variant="default"
              onConfirm={() => resetUsage.mutate()}
            />
            <ConfirmDialog
              trigger={
                <Button variant="destructive" size="sm" disabled={anyMutationPending}>
                  {revoke.isPending ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Ban className="mr-2 h-3 w-3" />}
                  Revoke this key
                </Button>
              }
              title="Revoke the current API key?"
              description="This permanently revokes the key OpenFiber is using right now. Every subsequent request from this app will fail until you configure a new key."
              confirmLabel="Revoke key"
              onConfirm={() => revoke.mutate()}
            />
          </div>

          {mutationError && <p className="text-xs text-destructive">{mutationError.message}</p>}
        </div>

        {/* Other keys (read-only) */}
        {keys.length > 1 && (
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-2 text-left font-medium">Name</th>
                  <th className="px-4 py-2 text-left font-medium">Prefix</th>
                  <th className="px-4 py-2 text-right font-medium">Used</th>
                  <th className="px-4 py-2 text-right font-medium">Limit</th>
                  <th className="px-4 py-2 text-right font-medium">Expires</th>
                </tr>
              </thead>
              <tbody>
                {keys.filter((k) => k.id !== key.id).map((k) => (
                  <tr key={k.id} className="border-b last:border-0">
                    <td className="px-4 py-2">{k.name}</td>
                    <td className="px-4 py-2 font-mono text-xs">{k.prefix}…</td>
                    <td className="px-4 py-2 text-right font-mono text-xs">{formatNumber(k.creditsUsed)}</td>
                    <td className="px-4 py-2 text-right font-mono text-xs">{k.maxCredits != null ? formatNumber(k.maxCredits) : "—"}</td>
                    <td className="px-4 py-2 text-right text-xs">{k.expiresAt ? formatExpirationDate(k.expiresAt) : "never"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Actions apply to the key OpenFiber is configured with. Create additional keys on{" "}
          <a href="https://fiber.ai/app/api" target="_blank" rel="noopener noreferrer" className="text-primary underline">
            fiber.ai
          </a>
        </p>
      </CardContent>
    </Card>
  );
}
