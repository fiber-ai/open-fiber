import { useState } from "react";
import { Github, Linkedin, Loader2, ArrowRight } from "lucide-react";
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
import { ToggleButtonGroup } from "@/components/shared/toggle-button-group";

type Mode = "linkedin-to-github" | "github-to-linkedin";

export default function GithubLookupsPage() {
  const [mode, setMode] = useState<Mode>("github-to-linkedin");
  const [input, setInput] = useState("");

  // GitHub → LinkedIn
  const triggerG2L = trpc.tools.triggerGithubToLinkedIn.useMutation();
  const [g2lRunId, setG2lRunId] = useState<string | null>(null);
  const pollG2L = trpc.tools.pollGithubToLinkedIn.useQuery(
    { githubAgentRunId: g2lRunId! },
    {
      enabled: !!g2lRunId,
      refetchInterval: (q) => {
        const d = q.state.data;
        if (d?.output?.status === "completed" || d?.output?.status === "failed") return false;
        return 3000;
      },
    }
  );

  // LinkedIn → GitHub
  const triggerL2G = trpc.tools.triggerGithubLookup.useMutation();
  const [l2gRunId, setL2gRunId] = useState<string | null>(null);
  const pollL2G = trpc.tools.pollGithubLookup.useQuery(
    { githubAgentRunId: l2gRunId! },
    {
      enabled: !!l2gRunId,
      refetchInterval: (q) => {
        const d = q.state.data;
        if (d?.output?.status === "completed" || d?.output?.status === "failed") return false;
        return 3000;
      },
    }
  );

  const handleSubmit = () => {
    const items = input.split("\n").map((s) => s.trim()).filter(Boolean);
    if (items.length === 0) return;

    if (mode === "github-to-linkedin") {
      setG2lRunId(null);
      triggerG2L.mutate(
        { people: items.map((u) => ({ githubUsername: u })), outputType: "both" },
        {
          onSuccess: (data) => {
            
            if (data?.output?.githubAgentRunId) setG2lRunId(data.output.githubAgentRunId);
          },
        }
      );
    } else {
      setL2gRunId(null);
      triggerL2G.mutate(
        { people: items.map((u) => ({ linkedinUrl: u })) },
        {
          onSuccess: (data) => {
            
            if (data?.output?.githubAgentRunId) setL2gRunId(data.output.githubAgentRunId);
          },
        }
      );
    }
  };

  const g2lData = pollG2L.data;
  const l2gData = pollL2G.data;

  const isPolling = (mode === "github-to-linkedin" && g2lRunId && g2lData?.output?.status === "processing") ||
    (mode === "linkedin-to-github" && l2gRunId && l2gData?.output?.status === "processing");
  const isTriggering = triggerG2L.isPending || triggerL2G.isPending;
  const activeResults = mode === "github-to-linkedin" ? g2lData?.output?.results : l2gData?.output?.results;
  const isDone = mode === "github-to-linkedin" ? g2lData?.output?.status === "completed" : l2gData?.output?.status === "completed";

  return (
    <div className="flex h-full flex-col">
      <Header icon={Github} title="GitHub Lookups" description="Map between GitHub usernames and LinkedIn profiles" />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-3xl space-y-6">
          <ToggleButtonGroup
            options={[
              { value: "github-to-linkedin" as Mode, label: "GitHub \u2192 LinkedIn", icon: Github },
              { value: "linkedin-to-github" as Mode, label: "LinkedIn \u2192 GitHub", icon: Linkedin },
            ]}
            value={mode}
            onChange={(v) => setMode(v as Mode)}
          />

          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label>{mode === "github-to-linkedin" ? "GitHub Usernames (one per line)" : "LinkedIn URLs (one per line)"}</Label>
                <Textarea
                  className="min-h-[100px]"
                  placeholder={mode === "github-to-linkedin" ? "torvalds\ngvanrossum\nmitsuhiko" : "https://www.linkedin.com/in/username"}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                />
              </div>
              <Button onClick={handleSubmit} disabled={!input.trim() || isTriggering || !!isPolling}>
                {isTriggering || isPolling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Github className="mr-2 h-4 w-4" />}
                Look Up
              </Button>
            </CardContent>
          </Card>

          {(triggerG2L.isError || triggerL2G.isError) && (
            <ErrorDisplay message={(triggerG2L.error ?? triggerL2G.error)!.message} />
          )}

          {isPolling && <PollingIndicator message="Looking up profiles..." />}

          {isDone && activeResults && activeResults.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Results</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {activeResults.map((r, i) => (
                    <div key={i} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                      <span className="font-mono text-xs">
                        {(r.githubUsername as string) ?? (r.linkedinUrl as string) ?? (r.externalId as string) ?? `Result ${i + 1}`}
                      </span>
                      <div className="flex items-center gap-2">
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        {(r.linkedinUrl as string) && (
                          <div className="flex items-center gap-1">
                            <a href={r.linkedinUrl as string} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs font-mono">
                              {r.linkedinUrl as string}
                            </a>
                            <CopyButton value={r.linkedinUrl as string} />
                          </div>
                        )}
                        {(r.githubUrl as string) && (
                          <div className="flex items-center gap-1">
                            <a href={r.githubUrl as string} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs font-mono">
                              {r.githubUrl as string}
                            </a>
                            <CopyButton value={r.githubUrl as string} />
                          </div>
                        )}
                        {!(r.linkedinUrl as string) && !(r.githubUrl as string) && (
                          <span className="text-xs text-muted-foreground">Not found</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
}
