import { useState } from "react";
import { Twitter, Search, User, MessageSquare, Loader2, Heart, Repeat2, Reply } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorDisplay } from "@/components/shared/error-display";
import { ToggleButtonGroup } from "@/components/shared/toggle-button-group";

type Mode = "profile" | "search" | "tweets" | "tweet-details";

export default function TwitterPage() {
  const [mode, setMode] = useState<Mode>("profile");
  const [handle, setHandle] = useState("");
  const [query, setQuery] = useState("");
  const [tweetId, setTweetId] = useState("");

  const profileMutation = trpc.twitter.getProfile.useMutation();
  const searchMutation = trpc.twitter.search.useMutation();
  const tweetsMutation = trpc.twitter.getUserTweets.useMutation();
  const tweetDetailsMutation = trpc.twitter.getTweetDetails.useMutation();
  const repliesMutation = trpc.twitter.getTweetReplies.useMutation();

  const handleSubmit = () => {
    if (mode === "profile" && handle.trim()) {
      profileMutation.mutate({ handle: handle.trim() });
    } else if (mode === "search" && query.trim()) {
      searchMutation.mutate({ query: query.trim() });
    } else if (mode === "tweets" && handle.trim()) {
      tweetsMutation.mutate({ handle: handle.trim() });
    } else if (mode === "tweet-details" && tweetId.trim()) {
      tweetDetailsMutation.mutate({ tweetId: tweetId.trim() });
      repliesMutation.mutate({ tweetId: tweetId.trim() });
    }
  };

  const activeMutation = { profile: profileMutation, search: searchMutation, tweets: tweetsMutation, "tweet-details": tweetDetailsMutation }[mode];
  const isLoading = activeMutation.isPending || (mode === "tweet-details" && repliesMutation.isPending);

  // Extract results generically — API shape varies by endpoint
  const profileData = profileMutation.data?.output;
  const searchResults = (searchMutation.data?.output?.data ?? searchMutation.data?.output?.results) as Record<string, unknown>[] | undefined;
  const tweetsResults = (tweetsMutation.data?.output?.data ?? tweetsMutation.data?.output?.results) as Record<string, unknown>[] | undefined;
  const tweetDetail = tweetDetailsMutation.data?.output;
  const replies = (repliesMutation.data?.output?.data ?? repliesMutation.data?.output?.results) as Record<string, unknown>[] | undefined;

  return (
    <div className="flex h-full flex-col">
      <Header icon={Twitter} title="Twitter / X" description="Fetch profiles, search tweets, and explore user activity" />

      <div className="border-b p-4 space-y-3">
        <ToggleButtonGroup
          options={[
            { value: "profile" as Mode, label: "Profile", icon: User },
            { value: "search" as Mode, label: "Search", icon: Search },
            { value: "tweets" as Mode, label: "User Tweets", icon: MessageSquare },
            { value: "tweet-details" as Mode, label: "Tweet Details", icon: Reply },
          ]}
          value={mode}
          onChange={(v) => setMode(v as Mode)}
        />

        <div className="flex gap-3 items-end">
          {(mode === "profile" || mode === "tweets") && (
            <div className="flex-1 space-y-1.5">
              <Label className="text-xs font-medium">Twitter Handle</Label>
              <Input placeholder="e.g. elonmusk" value={handle} onChange={(e) => setHandle(e.target.value)} />
            </div>
          )}
          {mode === "search" && (
            <div className="flex-1 space-y-1.5">
              <Label className="text-xs font-medium">Search Query</Label>
              <Input placeholder='e.g. "hiring engineers"' value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
          )}
          {mode === "tweet-details" && (
            <div className="flex-1 space-y-1.5">
              <Label className="text-xs font-medium">Tweet ID</Label>
              <Input placeholder="e.g. 1234567890123456789" value={tweetId} onChange={(e) => setTweetId(e.target.value)} />
            </div>
          )}
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Twitter className="mr-2 h-4 w-4" />}
            Fetch
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {activeMutation.isError && <ErrorDisplay message={activeMutation.error.message} />}

        {/* Profile result */}
        {mode === "profile" && profileMutation.isSuccess && profileData && (
          <div className="mx-auto max-w-2xl">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-4 w-4" />
                  @{(profileData.username as string) ?? (profileData.screen_name as string) ?? handle}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(profileData.name as string) && <p className="font-medium">{profileData.name as string}</p>}
                {(profileData.description as string) && <p className="text-sm text-muted-foreground">{profileData.description as string}</p>}
                <div className="flex gap-4 text-sm">
                  {(profileData.followers_count as number) != null && (
                    <span><strong>{(profileData.followers_count as number).toLocaleString()}</strong> followers</span>
                  )}
                  {(profileData.following_count as number) != null && (
                    <span><strong>{(profileData.following_count as number).toLocaleString()}</strong> following</span>
                  )}
                  {(profileData.tweet_count as number) != null && (
                    <span><strong>{(profileData.tweet_count as number).toLocaleString()}</strong> tweets</span>
                  )}
                </div>
                {(profileData.location as string) && (
                  <Badge variant="outline">{profileData.location as string}</Badge>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Search / Tweets results */}
        {(mode === "search" || mode === "tweets") && (() => {
          const items = mode === "search" ? searchResults : tweetsResults;
          const mutation = mode === "search" ? searchMutation : tweetsMutation;
          if (!mutation.isSuccess) return null;
          if (!items?.length) return <EmptyState icon={Twitter} title="No results" description="No tweets found for this query." />;
          return (
            <div className="mx-auto max-w-2xl space-y-3">
              {items.map((item, i) => (
                <Card key={(item.id as string) ?? i}>
                  <CardContent className="pt-4 space-y-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-medium">@{(item.username as string) ?? (item.author as string) ?? "unknown"}</span>
                      {(item.created_at as string) && <span>{new Date(item.created_at as string).toLocaleDateString()}</span>}
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{(item.text as string) ?? (item.full_text as string) ?? "(No content)"}</p>
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      {(item.like_count as number) != null && (
                        <span className="flex items-center gap-1"><Heart className="h-3 w-3" />{(item.like_count as number)}</span>
                      )}
                      {(item.retweet_count as number) != null && (
                        <span className="flex items-center gap-1"><Repeat2 className="h-3 w-3" />{(item.retweet_count as number)}</span>
                      )}
                      {(item.reply_count as number) != null && (
                        <span className="flex items-center gap-1"><Reply className="h-3 w-3" />{(item.reply_count as number)}</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          );
        })()}

        {/* Tweet Details */}
        {mode === "tweet-details" && tweetDetailsMutation.isSuccess && tweetDetail && (
          <div className="mx-auto max-w-2xl space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Tweet</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm whitespace-pre-wrap">{(tweetDetail.text as string) ?? "(No content)"}</p>
                <div className="flex gap-3 text-xs text-muted-foreground">
                  {(tweetDetail.like_count as number) != null && (
                    <span className="flex items-center gap-1"><Heart className="h-3 w-3" />{(tweetDetail.like_count as number)}</span>
                  )}
                  {(tweetDetail.retweet_count as number) != null && (
                    <span className="flex items-center gap-1"><Repeat2 className="h-3 w-3" />{(tweetDetail.retweet_count as number)}</span>
                  )}
                </div>
              </CardContent>
            </Card>
            {replies && replies.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base">Replies ({replies.length})</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {replies.map((r, i) => (
                    <div key={i} className="border-b pb-2 last:border-0 last:pb-0">
                      <p className="text-xs font-medium text-muted-foreground">@{(r.username as string) ?? "unknown"}</p>
                      <p className="text-sm">{(r.text as string) ?? ""}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
