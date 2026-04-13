import { useState } from "react";
import { Share2, Loader2, ExternalLink } from "lucide-react";
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


export default function SocialMediaPage() {
  const [input, setInput] = useState("");
  const [runId, setRunId] = useState<string | null>(null);

  const triggerMutation = trpc.tools.triggerSocialMediaLookup.useMutation();

  const pollQuery = trpc.tools.pollSocialMediaLookup.useQuery(
    { socialMediaFinderRunId: runId! },
    {
      enabled: !!runId,
      refetchInterval: (q) => {
        const status = q.state.data?.output?.status;
        if (status === "completed" || status === "failed") return false;
        return 3000;
      },
    }
  );

  const handleSubmit = () => {
    const urls = input.split("\n").map((s) => s.trim()).filter(Boolean);
    if (urls.length === 0) return;
    setRunId(null);
    triggerMutation.mutate(
      { people: urls.map((u) => ({ linkedinUrl: u })) },
      {
        onSuccess: (data) => {
          if (data?.output?.socialMediaFinderRunId) {
            setRunId(data.output.socialMediaFinderRunId);
          }
        },
      }
    );
  };

  const status = pollQuery.data?.output?.status;
  const results = pollQuery.data?.output?.results;
  const isPolling = !!runId && status !== "completed" && status !== "failed";

  return (
    <div className="flex h-full flex-col">
      <Header icon={Share2} title="Social Media Finder" description="Find all social profiles for a person across platforms" />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-3xl space-y-6">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label>LinkedIn URLs (one per line)</Label>
                <Textarea
                  className="min-h-[120px] font-mono text-xs"
                  placeholder={"https://www.linkedin.com/in/person-1\nhttps://www.linkedin.com/in/person-2"}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                />
              </div>
              <Button onClick={handleSubmit} disabled={!input.trim() || triggerMutation.isPending || isPolling}>
                {triggerMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Share2 className="mr-2 h-4 w-4" />}
                Find Social Profiles
              </Button>
            </CardContent>
          </Card>

          {triggerMutation.isError && <ErrorDisplay message={triggerMutation.error.message} />}
          {pollQuery.isError && <ErrorDisplay message={pollQuery.error.message} />}

          {isPolling && <PollingIndicator message="Searching for social profiles..." />}

          {status === "completed" && results && results.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Results ({results.length})</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {results.map((r, i) => (
                  <div key={i} className="border-b pb-3 last:border-0 last:pb-0 space-y-2">
                    <p className="text-sm font-medium">
                      {(r.name as string) ?? (r.linkedinUrl as string) ?? `Person ${i + 1}`}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(r)
                        .filter(([key, val]) => val && typeof val === "string" && (key.includes("Url") || key.includes("url")) && key !== "linkedinUrl")
                        .map(([key, val]) => (
                          <a key={key} href={val as string} target="_blank" rel="noopener noreferrer">
                            <Badge variant="outline" className="gap-1 cursor-pointer hover:bg-accent">
                              {key.replace(/Url$/i, "").replace(/([A-Z])/g, " $1").trim()}
                              <ExternalLink className="h-3 w-3" />
                            </Badge>
                          </a>
                        ))}
                      {(r.twitter as string) && (
                        <a href={`https://twitter.com/${r.twitter}`} target="_blank" rel="noopener noreferrer">
                          <Badge variant="outline" className="gap-1 cursor-pointer hover:bg-accent">Twitter <ExternalLink className="h-3 w-3" /></Badge>
                        </a>
                      )}
                      {(r.github as string) && (
                        <a href={`https://github.com/${r.github}`} target="_blank" rel="noopener noreferrer">
                          <Badge variant="outline" className="gap-1 cursor-pointer hover:bg-accent">GitHub <ExternalLink className="h-3 w-3" /></Badge>
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {status === "completed" && (!results || results.length === 0) && (
            <EmptyState icon={Share2} title="No results" description="No social profiles found for the provided LinkedIn URLs." />
          )}

        </div>
      </div>
    </div>
  );
}
