import { useState, useEffect } from "react";
import { Users, Loader2, User, Building2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PollingIndicator } from "@/components/shared/polling-indicator";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorDisplay } from "@/components/shared/error-display";
import { ToggleButtonGroup } from "@/components/shared/toggle-button-group";

type Mode = "profile" | "company";

export default function BulkEnrichPage() {
  const [mode, setMode] = useState<Mode>("profile");
  const [input, setInput] = useState("");
  const [taskId, setTaskId] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [pages, setPages] = useState<Record<string, Record<string, unknown>[]>>({});

  const start = trpc.linkedin.startBatchLiveEnrich.useMutation({
    onSuccess: (data) => {
      if (data?.output?.taskId) setTaskId(data.output.taskId);
    },
  });

  const poll = trpc.linkedin.pollBatchLiveEnrich.useQuery(
    { taskId: taskId!, cursor, take: 100 },
    {
      enabled: !!taskId,
      refetchInterval: (q) => {
        const o = q.state.data?.output;
        if (o?.status === "FAILED") return false;
        if (o?.status === "COMPLETED" && !o?.nextCursor) return false;
        return 3000;
      },
    }
  );

  // Accumulate result pages keyed by cursor (idempotent across refetches);
  // advance to the next page only once the batch has COMPLETED.
  useEffect(() => {
    const o = poll.data?.output;
    if (!o) return;
    setPages((prev) => ({ ...prev, [cursor ?? "__start__"]: (o.results ?? []) as Record<string, unknown>[] }));
    if (o.status === "COMPLETED" && o.nextCursor) setCursor(o.nextCursor);
  }, [poll.data, cursor]);

  const handleSubmit = () => {
    const lines = input.split("\n").map((s) => s.trim()).filter(Boolean);
    if (lines.length === 0) return;
    setTaskId(null);
    setCursor(null);
    setPages({});
    start.mutate({ type: mode === "profile" ? "PROFILE" : "COMPANY", identifiers: lines });
  };

  const status = poll.data?.output?.status;
  const nextCursor = poll.data?.output?.nextCursor;
  const isRunning = start.isPending || (!!taskId && status !== "FAILED" && !(status === "COMPLETED" && !nextCursor));
  const results = Object.values(pages).flat();

  return (
    <div className="flex h-full flex-col">
      <Header icon={Users} title="Bulk Live Enrich" description="Fetch fresh LinkedIn data for multiple profiles or companies at once" />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-3xl space-y-6">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <ToggleButtonGroup
                options={[
                  { value: "profile" as Mode, label: "Profiles", icon: User },
                  { value: "company" as Mode, label: "Companies", icon: Building2 },
                ]}
                value={mode}
                onChange={(v) => setMode(v as Mode)}
              />

              <div className="space-y-2">
                <Label>
                  {mode === "profile"
                    ? "LinkedIn Profile URLs or slugs (one per line)"
                    : "LinkedIn Company URLs, slugs, or org IDs (one per line)"}
                </Label>
                <Textarea
                  className="min-h-[140px] font-mono text-xs"
                  placeholder={
                    mode === "profile"
                      ? "https://www.linkedin.com/in/person-1\nhttps://www.linkedin.com/in/person-2"
                      : "https://www.linkedin.com/company/stripe\nmicrosoft\n1035"
                  }
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                />
                {input.trim() && (
                  <p className="text-xs text-muted-foreground">
                    {input.split("\n").filter((s) => s.trim()).length} {mode === "profile" ? "profiles" : "companies"} to enrich
                  </p>
                )}
              </div>

              <Button onClick={handleSubmit} disabled={!input.trim() || isRunning}>
                {isRunning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Users className="mr-2 h-4 w-4" />}
                Enrich All
              </Button>
            </CardContent>
          </Card>

          {start.isError && <ErrorDisplay message={start.error.message} />}
          {poll.isError && <ErrorDisplay message={poll.error.message} />}

          {isRunning && !start.isError && <PollingIndicator message="Enriching profiles..." />}

          {status === "COMPLETED" && results.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Results <Badge variant="secondary" className="ml-2">{results.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {results.map((item, i) => {
                    const d = (item.profile ?? item.company ?? item) as Record<string, unknown>;
                    const name = (d.name as string) ?? (d.preferred_name as string) ?? (d.first_name as string) ?? `Result ${i + 1}`;
                    const headline = (d.headline as string) ?? (d.description as string) ?? null;
                    const itemStatus = item.status as string | undefined;
                    return (
                      <div key={i} className="rounded-md border p-3 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium">{name}</p>
                          {itemStatus && itemStatus !== "COMPLETED" && (
                            <Badge variant="outline" className="text-xs">{itemStatus.replace(/_/g, " ")}</Badge>
                          )}
                        </div>
                        {headline && <p className="text-xs text-muted-foreground line-clamp-2">{headline}</p>}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {status === "COMPLETED" && results.length === 0 && (
            <EmptyState icon={Users} title="No results" description="The batch completed but returned no enriched records." />
          )}

          {status === "FAILED" && (
            <ErrorDisplay message="The bulk enrichment job failed. Please try again." />
          )}

          {!taskId && !start.isPending && !start.isError && (
            <EmptyState
              icon={Users}
              title="Bulk Live Enrichment"
              description="Paste LinkedIn profile or company identifiers (one per line) to fetch fresh data in bulk."
            />
          )}
        </div>
      </div>
    </div>
  );
}
