import { useState } from "react";
import { Compass, Loader2, ExternalLink } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PollingIndicator } from "@/components/shared/polling-indicator";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorDisplay } from "@/components/shared/error-display";

export default function SalesNavigatorPage() {
  const [url, setUrl] = useState("");
  const [taskId, setTaskId] = useState<string | null>(null);

  const triggerMutation = trpc.salesNav.triggerUrlScrape.useMutation();

  const pollQuery = trpc.salesNav.pollUrlScrape.useQuery(
    { taskId: taskId! },
    {
      enabled: !!taskId,
      refetchInterval: (q) => {
        const status = q.state.data?.output?.status;
        if (status === "completed" || status === "failed") return false;
        return 3000;
      },
    }
  );

  const handleSubmit = () => {
    if (!url.trim()) return;
    setTaskId(null);
    triggerMutation.mutate(
      { salesNavUrl: url.trim() },
      {
        onSuccess: (data) => {
          if (data?.output?.taskId) setTaskId(data.output.taskId);
        },
      }
    );
  };

  const status = pollQuery.data?.output?.status;
  const results = pollQuery.data?.output?.results;
  const isPolling = !!taskId && status !== "completed" && status !== "failed";

  return (
    <div className="flex h-full flex-col">
      <Header
        title="Sales Navigator"
        description="Import leads from LinkedIn Sales Navigator search URLs"
      />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-3xl space-y-6">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label>Sales Navigator Search URL</Label>
                <Input
                  placeholder="https://www.linkedin.com/sales/search/people?..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Paste a Sales Navigator search URL. Requires an active LinkedIn Sales Navigator subscription.
                </p>
              </div>
              <Button onClick={handleSubmit} disabled={!url.trim() || triggerMutation.isPending || isPolling}>
                {triggerMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Compass className="mr-2 h-4 w-4" />
                )}
                Import Leads
              </Button>
            </CardContent>
          </Card>

          {triggerMutation.isError && <ErrorDisplay message={triggerMutation.error.message} />}
          {pollQuery.isError && <ErrorDisplay message={pollQuery.error.message} />}

          {isPolling && <PollingIndicator message="Importing leads from Sales Navigator..." />}

          {status === "failed" && (
            <ErrorDisplay message="Sales Navigator import failed. The URL may be invalid or the scrape timed out." />
          )}

          {status === "completed" && results && results.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Imported Leads
                  <Badge variant="secondary" className="ml-2">{results.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-4 py-2 text-left font-medium">Name</th>
                        <th className="px-4 py-2 text-left font-medium">Title</th>
                        <th className="px-4 py-2 text-left font-medium">Company</th>
                        <th className="px-4 py-2 text-left font-medium">LinkedIn</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((r, i) => (
                        <tr key={i} className="border-b">
                          <td className="px-4 py-2 font-medium">
                            {(r.name as string) ?? ([r.firstName, r.lastName].filter(Boolean).join(" ") || "—")}
                          </td>
                          <td className="px-4 py-2 text-muted-foreground">{(r.title as string) ?? (r.jobTitle as string) ?? "—"}</td>
                          <td className="px-4 py-2 text-muted-foreground">{(r.company as string) ?? (r.companyName as string) ?? "—"}</td>
                          <td className="px-4 py-2">
                            {(r.linkedinUrl as string) ? (
                              <a href={r.linkedinUrl as string} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
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

          {status === "completed" && (!results || results.length === 0) && (
            <EmptyState icon={Compass} title="No leads found" description="The import completed but no leads were returned." />
          )}

          {!triggerMutation.isSuccess && !isPolling && !triggerMutation.isPending && (
            <EmptyState icon={Compass} title="Sales Navigator Import" description="Paste a Sales Navigator search URL to import leads into Fiber." />
          )}
        </div>
      </div>
    </div>
  );
}
