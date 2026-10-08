import { CalendarClock } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/shared/copy-button";
import { formatNumber } from "@/lib/utils";

const DAY_MS = 24 * 60 * 60 * 1000;

function formatResetDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function daysUntil(iso: string): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / DAY_MS));
}

function shortId(id: string): string {
  return id.length > 12 ? `…${id.slice(-8)}` : id;
}

/**
 * Lists the org's current usage periods — one per active subscription — with the
 * credits used in each and when it resets. The Fiber public API only exposes the
 * current period, so past periods aren't shown yet (FIB-15819).
 * Hides itself if the request fails; the summary cards above already surface errors.
 */
export function UsagePeriodsCard() {
  const usagePeriods = trpc.utility.getUsagePeriods.useQuery(undefined, {
    retry: false,
    staleTime: 10_000,
  });

  if (usagePeriods.isLoading || usagePeriods.isError) return null;
  const periods = usagePeriods.data?.output.periods ?? [];
  if (periods.length === 0) return null;

  return (
    <Card data-testid="usage-periods">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarClock className="h-4 w-4" />
          Usage Periods
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {periods.length === 1
            ? "Your current usage period."
            : `${periods.length} active subscriptions, each with its own usage period. The totals above add them together.`}
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-2 text-left font-medium">Subscription</th>
                <th className="px-4 py-2 text-left font-medium">Usage</th>
                <th className="px-4 py-2 text-right font-medium">Available</th>
                <th className="px-4 py-2 text-right font-medium">Resets on</th>
              </tr>
            </thead>
            <tbody>
              {periods.map((p) => {
                const pct = p.max > 0 ? Math.min((p.used / p.max) * 100, 100) : 0;
                const days = daysUntil(p.usagePeriodResetsOn);
                return (
                  <tr key={p.subscriptionId} data-testid="usage-period-row" className="border-b last:border-0">
                    <td className="px-4 py-2">
                      <span className="inline-flex items-center gap-1 font-mono text-xs" title={p.subscriptionId}>
                        {shortId(p.subscriptionId)}
                        <CopyButton value={p.subscriptionId} />
                      </span>
                    </td>
                    <td className="px-4 py-2 min-w-[180px]">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="tabular-nums">
                          {formatNumber(p.used)} / {formatNumber(p.max)}
                        </span>
                        <span className="text-muted-foreground tabular-nums">{Math.round(pct)}%</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full transition-all duration-500 ${pct >= 90 ? "bg-amber-500" : "bg-primary"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-xs">{formatNumber(p.available)}</td>
                    <td className="px-4 py-2 text-right">
                      <div className="text-sm">{formatResetDate(p.usagePeriodResetsOn)}</div>
                      <Badge variant="secondary" className="mt-0.5 text-[10px]">
                        {days === 0 ? "today" : days === 1 ? "in 1 day" : `in ${days} days`}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Past usage periods aren&apos;t available through the Fiber API yet. View your billing history on{" "}
          <a href="https://fiber.ai/app/api" target="_blank" rel="noopener noreferrer" className="text-primary underline">
            fiber.ai
          </a>
          .
        </p>
      </CardContent>
    </Card>
  );
}
