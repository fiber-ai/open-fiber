import { useState } from "react";
import { Music2, Search, User, Video, Loader2, ExternalLink, Heart, MessageCircle, Share2 } from "lucide-react";
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

type Mode = "profile" | "search" | "video";
type SearchKind = "keyword" | "users";
type Row = Record<string, unknown>;

const str = (o: Row, ...keys: string[]): string | undefined => {
  for (const k of keys) { const v = o[k]; if (typeof v === "string" && v) return v; }
  return undefined;
};
const num = (o: Row, ...keys: string[]): number | undefined => {
  for (const k of keys) { const v = o[k]; if (typeof v === "number") return v; }
  return undefined;
};

function VideoCard({ v }: { v: Row }) {
  const url = str(v, "videoUrl", "url");
  return (
    <Card>
      <CardContent className="pt-4 space-y-2">
        {str(v, "handle", "authorHandle") && <p className="text-xs text-muted-foreground">@{str(v, "handle", "authorHandle")}</p>}
        <p className="text-sm">{str(v, "caption", "desc", "title") ?? "(no caption)"}</p>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {num(v, "likeCount", "diggCount") != null && <span className="flex items-center gap-1"><Heart className="h-3 w-3" />{num(v, "likeCount", "diggCount")!.toLocaleString()}</span>}
          {num(v, "commentCount") != null && <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" />{num(v, "commentCount")!.toLocaleString()}</span>}
          {num(v, "shareCount") != null && <span className="flex items-center gap-1"><Share2 className="h-3 w-3" />{num(v, "shareCount")!.toLocaleString()}</span>}
          {url && (
            <a href={url} target="_blank" rel="noopener noreferrer" className="ml-auto flex items-center gap-1 text-primary hover:underline">
              Watch on TikTok <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function TikTokPage() {
  const [mode, setMode] = useState<Mode>("profile");
  const [searchKind, setSearchKind] = useState<SearchKind>("keyword");
  const [handle, setHandle] = useState("");
  const [query, setQuery] = useState("");
  const [videoUrl, setVideoUrl] = useState("");

  const profile = trpc.tiktok.profile.useMutation();
  const userVideos = trpc.tiktok.userVideos.useMutation();
  const searchKeyword = trpc.tiktok.searchKeyword.useMutation();
  const searchUsers = trpc.tiktok.searchUsers.useMutation();
  const videoDetails = trpc.tiktok.videoDetails.useMutation();
  const videoComments = trpc.tiktok.videoComments.useMutation();

  const handleSubmit = () => {
    if (mode === "profile" && handle.trim()) {
      profile.mutate({ handle: handle.trim() });
      userVideos.mutate({ handle: handle.trim() });
    } else if (mode === "search" && query.trim()) {
      if (searchKind === "keyword") searchKeyword.mutate({ query: query.trim() });
      else searchUsers.mutate({ query: query.trim() });
    } else if (mode === "video" && videoUrl.trim()) {
      videoDetails.mutate({ videoUrl: videoUrl.trim() });
      videoComments.mutate({ videoUrl: videoUrl.trim() });
    }
  };

  const p = profile.data?.output as Row | undefined;
  const profileVideos = (userVideos.data?.output?.videos ?? []) as Row[];
  const keywordVideos = (searchKeyword.data?.output?.videos ?? []) as Row[];
  const foundUsers = (searchUsers.data?.output?.users ?? []) as Row[];
  const vDetail = videoDetails.data?.output as Row | undefined;
  const isLoading = profile.isPending || userVideos.isPending || searchKeyword.isPending || searchUsers.isPending || videoDetails.isPending || videoComments.isPending;

  return (
    <div className="flex h-full flex-col">
      <Header icon={Music2} title="TikTok" description="Look up profiles, search videos and users, and inspect a video" />

      <div className="border-b p-4 space-y-3">
        <ToggleButtonGroup
          options={[
            { value: "profile" as Mode, label: "Profile", icon: User },
            { value: "search" as Mode, label: "Search", icon: Search },
            { value: "video" as Mode, label: "Video", icon: Video },
          ]}
          value={mode}
          onChange={(v) => setMode(v as Mode)}
        />
        <div className="flex flex-wrap gap-3 items-end">
          {mode === "profile" && (
            <div className="flex-1 max-w-sm space-y-1.5">
              <Label className="text-xs font-medium">TikTok Handle</Label>
              <Input placeholder="e.g. nasa" value={handle} onChange={(e) => setHandle(e.target.value)} />
            </div>
          )}
          {mode === "search" && (
            <>
              <ToggleButtonGroup
                options={[
                  { value: "keyword" as SearchKind, label: "Videos", icon: Video },
                  { value: "users" as SearchKind, label: "Users", icon: User },
                ]}
                value={searchKind}
                onChange={(v) => setSearchKind(v as SearchKind)}
              />
              <div className="flex-1 min-w-[220px] space-y-1.5">
                <Label className="text-xs font-medium">Query</Label>
                <Input placeholder='e.g. "product launch"' value={query} onChange={(e) => setQuery(e.target.value)} />
              </div>
            </>
          )}
          {mode === "video" && (
            <div className="flex-1 min-w-[280px] space-y-1.5">
              <Label className="text-xs font-medium">Video URL</Label>
              <Input placeholder="https://www.tiktok.com/@user/video/123..." value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} />
            </div>
          )}
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Music2 className="mr-2 h-4 w-4" />}
            Fetch
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {/* Profile */}
        {mode === "profile" && profile.isError && <ErrorDisplay message={profile.error.message} />}
        {mode === "profile" && profile.isSuccess && p && (
          <div className="mx-auto max-w-2xl space-y-4">
            <Card>
              <CardContent className="pt-6 space-y-1">
                <a href={`https://www.tiktok.com/@${str(p, "handle") ?? handle}`} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline flex items-center gap-1">
                  @{str(p, "handle") ?? handle} <ExternalLink className="h-3.5 w-3.5" />
                </a>
                {str(p, "nickname", "displayName") && <p className="text-sm font-medium">{str(p, "nickname", "displayName")}</p>}
                {str(p, "signature", "bio") && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{str(p, "signature", "bio")}</p>}
                <div className="flex gap-4 text-sm pt-1">
                  {num(p, "followerCount") != null && <span><strong>{num(p, "followerCount")!.toLocaleString()}</strong> followers</span>}
                  {num(p, "videoCount") != null && <span><strong>{num(p, "videoCount")!.toLocaleString()}</strong> videos</span>}
                  {num(p, "likeCount", "heartCount") != null && <span><strong>{num(p, "likeCount", "heartCount")!.toLocaleString()}</strong> likes</span>}
                </div>
              </CardContent>
            </Card>
            {profileVideos.length > 0 && <div className="space-y-3">{profileVideos.map((v, i) => <VideoCard key={i} v={v} />)}</div>}
          </div>
        )}

        {/* Search */}
        {mode === "search" && (() => {
          const mut = searchKind === "keyword" ? searchKeyword : searchUsers;
          if (mut.isError) return <ErrorDisplay message={mut.error.message} />;
          if (!mut.isSuccess) return null;
          if (searchKind === "keyword") {
            if (!keywordVideos.length) return <EmptyState icon={Music2} title="No videos" description="No videos found for this query." />;
            return <div className="mx-auto max-w-2xl space-y-3">{keywordVideos.map((v, i) => <VideoCard key={i} v={v} />)}</div>;
          }
          if (!foundUsers.length) return <EmptyState icon={User} title="No users" description="No users found for this query." />;
          return (
            <div className="mx-auto max-w-2xl space-y-2">
              {foundUsers.map((u, i) => (
                <Card key={i}><CardContent className="pt-4 flex items-center justify-between">
                  <div>
                    <a href={`https://www.tiktok.com/@${str(u, "handle")}`} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">@{str(u, "handle") ?? "unknown"}</a>
                    {str(u, "nickname", "displayName") && <p className="text-xs text-muted-foreground">{str(u, "nickname", "displayName")}</p>}
                  </div>
                  {num(u, "followerCount") != null && <span className="text-xs text-muted-foreground">{num(u, "followerCount")!.toLocaleString()} followers</span>}
                </CardContent></Card>
              ))}
            </div>
          );
        })()}

        {/* Video */}
        {mode === "video" && videoDetails.isError && <ErrorDisplay message={videoDetails.error.message} />}
        {mode === "video" && videoDetails.isSuccess && vDetail && (
          <div className="mx-auto max-w-2xl space-y-4">
            <VideoCard v={vDetail} />
            {(() => {
              const comments = (videoComments.data?.output?.comments ?? videoComments.data?.output?.data) as Row[] | undefined;
              if (!comments?.length) return null;
              return (
                <Card><CardContent className="pt-4 space-y-3">
                  <p className="text-sm font-medium">Comments ({comments.length})</p>
                  {comments.slice(0, 20).map((c, i) => (
                    <div key={i} className="border-b pb-2 last:border-0 last:pb-0">
                      <p className="text-xs font-medium text-muted-foreground">@{str(c, "handle", "author", "username") ?? "user"}</p>
                      <p className="text-sm">{str(c, "text", "comment", "content") ?? ""}</p>
                    </div>
                  ))}
                </CardContent></Card>
              );
            })()}
          </div>
        )}

        {!profile.data && !searchKeyword.data && !searchUsers.data && !videoDetails.data && !isLoading && (
          <EmptyState icon={Music2} title="Explore TikTok" description="Look up a profile, search videos/users, or inspect a video URL." />
        )}
      </div>
    </div>
  );
}
