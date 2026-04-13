import { useState } from "react";
import { Globe, ExternalLink, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PollingIndicator } from "@/components/shared/polling-indicator";
import { ErrorDisplay } from "@/components/shared/error-display";
import { CopyButton } from "@/components/shared/copy-button";
import { useCreditCosts } from "@/hooks/use-credit-costs";

interface DomainResult {
  companyName: string;
  bestDomain?: string | null;
  confidence?: number | null;
  rationale: string;
  allDomains?: string[] | null;
}

export default function DomainLookupPage() {
  const [companyNames, setCompanyNames] = useState("");
  const [context, setContext] = useState("");
  const [runId, setRunId] = useState<string | null>(null);
  const costs = useCreditCosts();

  const trigger = trpc.tools.triggerDomainLookup.useMutation({
    onSuccess: (data) => {
      
      if (data?.output?.domainAgentRunId) setRunId(data.output.domainAgentRunId);
    },
  });

  const poll = trpc.tools.pollDomainLookup.useQuery(
    { domainAgentRunId: runId!, pageSize: 100 },
    {
      enabled: !!runId,
      refetchInterval: (q) => {
        const d = q.state.data;
        if (d?.output?.status === "DONE" || d?.output?.status === "FAILED") return false;
        return 3000;
      },
    }
  );

  const pollData = poll.data;
  const isDone = pollData?.output?.status === "DONE";
  const results = pollData?.output?.data ?? [];

  const handleSubmit = () => {
    const names = companyNames.split("\n").map((s) => s.trim()).filter(Boolean);
    if (names.length === 0) return;
    setRunId(null);
    trigger.mutate({
      overAllContext: context,
      companyInfo: names.map((name) => ({ name })),
    });
  };

  const isPolling = !!runId && !isDone && pollData?.output?.status !== "FAILED";

  return (
    <div className="flex h-full flex-col">
      <Header icon={Globe} title="Domain Lookup" description={`AI-powered company domain discovery (${costs.domainLookup} credits/company)`} />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-3xl space-y-6">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label>Company Names (one per line)</Label>
                <Textarea
                  className="min-h-[100px]"
                  placeholder={"OpenAI\nAnthropic\nStripe"}
                  value={companyNames}
                  onChange={(e) => setCompanyNames(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Context (optional)</Label>
                <Input
                  placeholder='e.g. "YC startups", "British freight brokers"'
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                />
              </div>
              <Button onClick={handleSubmit} disabled={!companyNames.trim() || trigger.isPending || isPolling}>
                {trigger.isPending || isPolling ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Globe className="mr-2 h-4 w-4" />
                )}
                Look Up Domains
              </Button>
            </CardContent>
          </Card>

          {trigger.isError && <ErrorDisplay message={trigger.error.message} />}
          {isPolling && <PollingIndicator message="AI agent is researching domains..." />}

          {isDone && results.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Results</CardTitle></CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-4 py-2 text-left font-medium">Company</th>
                        <th className="px-4 py-2 text-left font-medium">Domain</th>
                        <th className="px-4 py-2 text-left font-medium">Confidence</th>
                        <th className="px-4 py-2 text-left font-medium">Rationale</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((r, i) => (
                        <tr key={i} className="border-b">
                          <td className="px-4 py-2 font-medium">{r.companyName}</td>
                          <td className="px-4 py-2">
                            {r.bestDomain ? (
                              <div className="flex items-center gap-1">
                                <a href={`https://${r.bestDomain}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-mono text-xs">
                                  {r.bestDomain}
                                </a>
                                <CopyButton value={r.bestDomain} />
                              </div>
                            ) : (
                              <span className="text-muted-foreground">Not found</span>
                            )}
                          </td>
                          <td className="px-4 py-2">
                            {r.confidence != null && (
                              <Badge variant={r.confidence >= 7 ? "default" : r.confidence >= 4 ? "secondary" : "destructive"} className="text-xs">
                                {r.confidence}/10
                              </Badge>
                            )}
                          </td>
                          <td className="px-4 py-2 text-xs text-muted-foreground max-w-[250px] truncate">{r.rationale}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
}
