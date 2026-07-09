import { useState } from "react";
import { Twitter, Search, User, MessageSquare, Loader2, Heart, Repeat2, Reply, ExternalLink, BadgeCheck } from "lucide-react";
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
import { XLogo } from "@/components/icons/x-logo";

type Mode = "profile" | "search" | "tweets" | "tweet-details";
type Row = Record<string, unknown>;

const str = (o: Row, ...keys: string[]): string | undefined => {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "string" && v) return v;
  }
  return undefined;
};
const num = (o: Row, ...keys: string[]): number | undefined => {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "number") return v;
  }
  return undefined;
};
const tweetUrl = (o: Row): string | undefined => {
  const url = str(o, "url", "tweetUrl");
  if (url) return url;
  const id = str(o, "id", "tweetId");
  const h = str(o, "handle", "username", "author");
  return id ? `https://x.com/${h ?? "i"}/status/${id}` : undefined;
};

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

  const profileData = profileMutation.data?.output as Row | undefined;
  const searchResults = (searchMutation.data?.output?.tweets ?? searchMutation.data?.output?.data ?? searchMutation.data?.output?.results) as Row[] | undefined;
  const tweetsResults = (tweetsMutation.data?.output?.tweets ?? tweetsMutation.data?.output?.data ?? tweetsMutation.data?.output?.results) as Row[] | undefined;
  const tweetDetail = tweetDetailsMutation.data?.output as Row | undefined;
  const replies = (repliesMutation.data?.output?.replies ?? repliesMutation.data?.output?.tweets ?? repliesMutation.data?.output?.data ?? repliesMutation.data?.output?.results) as Row[] | undefined;

  const renderTweet = (item: Row, i: number) => {
    const h = str(item, "handle", "username", "author");
    const name = str(item, "displayName", "name");
    const url = tweetUrl(item);
    return (
      <Card key={str(item, "id", "tweetId") ?? i}>
        <CardContent className="pt-4 space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {name && <span className="font-medium text-foreground">{name}</span>}
            {h && <span>@{h}</span>}
            {str(item, "createdAt", "created_at") && <span suppressHydrationWarning>· {new Date(str(item, "createdAt", "created_at")!).toLocaleDateString()}</span>}
          </div>
          <p className="text-sm whitespace-pre-wrap">{str(item, "text", "full_text") ?? "(No content)"}</p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {num(item, "likeCount", "like_count") != null && <span className="flex items-center gap-1"><Heart className="h-3 w-3" />{num(item, "likeCount", "like_count")!.toLocaleString()}</span>}
            {num(item, "retweetCount", "retweet_count") != null && <span className="flex items-center gap-1"><Repeat2 className="h-3 w-3" />{num(item, "retweetCount", "retweet_count")!.toLocaleString()}</span>}
            {num(item, "replyCount", "reply_count") != null && <span className="flex items-center gap-1"><Reply className="h-3 w-3" />{num(item, "replyCount", "reply_count")!.toLocaleString()}</span>}
            {url && (
              <a href={url} target="_blank" rel="noopener noreferrer" className="ml-auto flex items-center gap-1 text-primary hover:underline">
                View on X <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="flex h-full flex-col">
      <Header icon={XLogo} title="Twitter / X" description="Fetch profiles, search tweets, and explore user activity" />

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
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XLogo className="mr-2 h-4 w-4 invert" />}
            Fetch
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {activeMutation.isError && <ErrorDisplay message={activeMutation.error.message} />}

        {/* Profile result */}
        {mode === "profile" && profileMutation.isSuccess && profileData && (() => {
          const h = str(profileData, "handle", "username", "screen_name") ?? handle;
          const name = str(profileData, "displayName", "name");
          const followers = num(profileData, "followerCount", "followers_count");
          const following = num(profileData, "followingCount", "following_count");
          const tweets = num(profileData, "tweetCount", "tweet_count");
          const verified = profileData.isVerified === true || profileData.isBlueVerified === true;
          const externalUrl = str(profileData, "externalUrl");
          return (
            <div className="mx-auto max-w-2xl">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <a href={`https://x.com/${h}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                      @{h} <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                    {verified && <BadgeCheck className="h-4 w-4 text-primary" />}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {name && <p className="font-medium">{name}</p>}
                  {str(profileData, "bio", "description") && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{str(profileData, "bio", "description")}</p>}
                  <div className="flex gap-4 text-sm">
                    {followers != null && <span><strong>{followers.toLocaleString()}</strong> followers</span>}
                    {following != null && <span><strong>{following.toLocaleString()}</strong> following</span>}
                    {tweets != null && <span><strong>{tweets.toLocaleString()}</strong> tweets</span>}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {str(profileData, "location") && <Badge variant="outline">{str(profileData, "location")}</Badge>}
                    {externalUrl && (
                      <a href={externalUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                        {externalUrl.replace(/^https?:\/\//, "")} <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        })()}

        {/* Search / Tweets results */}
        {(mode === "search" || mode === "tweets") && (() => {
          const items = mode === "search" ? searchResults : tweetsResults;
          const mutation = mode === "search" ? searchMutation : tweetsMutation;
          if (!mutation.isSuccess) return null;
          if (!items?.length) return <EmptyState icon={Twitter} title="No results" description="No tweets found for this query." />;
          return <div className="mx-auto max-w-2xl space-y-3">{items.map(renderTweet)}</div>;
        })()}

        {/* Tweet Details */}
        {mode === "tweet-details" && tweetDetailsMutation.isSuccess && tweetDetail && (
          <div className="mx-auto max-w-2xl space-y-4">
            {renderTweet(tweetDetail, 0)}
            {replies && replies.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base">Replies ({replies.length})</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {replies.map((r, i) => (
                    <div key={i} className="border-b pb-2 last:border-0 last:pb-0">
                      <p className="text-xs font-medium text-muted-foreground">@{str(r, "handle", "username") ?? "unknown"}</p>
                      <p className="text-sm whitespace-pre-wrap">{str(r, "text", "full_text") ?? ""}</p>
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
