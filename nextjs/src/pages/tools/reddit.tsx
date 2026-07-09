import { useState } from "react";
import { MessageCircle, Search, Loader2, ExternalLink, ArrowBigUp, MessagesSquare } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorDisplay } from "@/components/shared/error-display";
import { ToggleButtonGroup } from "@/components/shared/toggle-button-group";
import { RedditLogo } from "@/components/icons/reddit-logo";

type Mode = "search" | "subreddit" | "subreddit-search";
type Row = Record<string, unknown>;

const str = (o: Row, ...keys: string[]): string | undefined => {
  for (const k of keys) { const v = o[k]; if (typeof v === "string" && v) return v; }
  return undefined;
};
const num = (o: Row, ...keys: string[]): number | undefined => {
  for (const k of keys) { const v = o[k]; if (typeof v === "number") return v; }
  return undefined;
};
const postUrl = (p: Row): string | undefined => {
  const permalink = str(p, "permalink");
  if (permalink) return permalink.startsWith("http") ? permalink : `https://www.reddit.com${permalink}`;
  return str(p, "url");
};

export default function RedditPage() {
  const [mode, setMode] = useState<Mode>("search");
  const [query, setQuery] = useState("");
  const [subreddit, setSubreddit] = useState("");

  const search = trpc.reddit.search.useMutation();
  const subredditPosts = trpc.reddit.subredditPosts.useMutation();
  const subredditSearch = trpc.reddit.subredditSearch.useMutation();

  const active = mode === "search" ? search : mode === "subreddit" ? subredditPosts : subredditSearch;

  const handleSubmit = () => {
    if (mode === "search" && query.trim()) search.mutate({ query: query.trim() });
    else if (mode === "subreddit" && subreddit.trim()) subredditPosts.mutate({ subreddit: subreddit.trim() });
    else if (mode === "subreddit-search" && subreddit.trim() && query.trim()) subredditSearch.mutate({ subreddit: subreddit.trim(), query: query.trim() });
  };

  const posts = (active.data?.output?.posts ?? []) as Row[];

  return (
    <div className="flex h-full flex-col">
      <Header icon={RedditLogo} title="Reddit" description="Search Reddit posts across all subreddits or within one" />

      <div className="border-b p-4 space-y-3">
        <ToggleButtonGroup
          options={[
            { value: "search" as Mode, label: "Search all", icon: Search },
            { value: "subreddit" as Mode, label: "Subreddit posts", icon: MessageCircle },
            { value: "subreddit-search" as Mode, label: "Search subreddit", icon: MessagesSquare },
          ]}
          value={mode}
          onChange={(v) => setMode(v as Mode)}
        />
        <div className="flex flex-wrap gap-3 items-end">
          {mode !== "search" && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Subreddit</Label>
              <Input placeholder="e.g. startups" value={subreddit} onChange={(e) => setSubreddit(e.target.value)} className="w-48" />
            </div>
          )}
          {mode !== "subreddit" && (
            <div className="flex-1 min-w-[240px] space-y-1.5">
              <Label className="text-xs font-medium">Query</Label>
              <Input placeholder='e.g. "AI sales tools"' value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
          )}
          <Button onClick={handleSubmit} disabled={active.isPending}>
            {active.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RedditLogo className="mr-2 h-4 w-4" />}
            Search
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {active.isError && <ErrorDisplay message={active.error.message} />}

        {active.isSuccess && posts.length === 0 && (
          <EmptyState icon={MessageCircle} title="No posts found" description="Try a different query or subreddit." />
        )}

        {posts.length > 0 && (
          <div className="mx-auto max-w-2xl space-y-3">
            {posts.map((p, i) => {
              const url = postUrl(p);
              const title = str(p, "title") ?? "(untitled)";
              return (
                <Card key={str(p, "id") ?? i}>
                  <CardContent className="pt-4 space-y-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {str(p, "subreddit") && <Badge variant="secondary" className="text-xs">r/{str(p, "subreddit")}</Badge>}
                      {str(p, "author") && <span>u/{str(p, "author")}</span>}
                    </div>
                    <p className="text-sm font-medium">{title}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {num(p, "score") != null && <span className="flex items-center gap-1"><ArrowBigUp className="h-3.5 w-3.5" />{num(p, "score")!.toLocaleString()}</span>}
                      {num(p, "numComments", "commentCount", "num_comments") != null && (
                        <span className="flex items-center gap-1"><MessagesSquare className="h-3.5 w-3.5" />{num(p, "numComments", "commentCount", "num_comments")!.toLocaleString()}</span>
                      )}
                      {url && (
                        <a href={url} target="_blank" rel="noopener noreferrer" className="ml-auto flex items-center gap-1 text-primary hover:underline">
                          View on Reddit <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {!active.data && !active.isPending && !active.isError && (
          <EmptyState icon={MessageCircle} title="Search Reddit" description="Choose a mode, enter a query or subreddit, and search." />
        )}
      </div>
    </div>
  );
}
