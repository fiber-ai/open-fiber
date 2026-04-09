import { useState } from "react";
import { Youtube, Search, Film, User, Loader2, MessageSquare, FileText } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorDisplay } from "@/components/shared/error-display";

type Mode = "search" | "video" | "channel";

export default function YouTubePage() {
  const [mode, setMode] = useState<Mode>("search");
  const [query, setQuery] = useState("");
  const [videoId, setVideoId] = useState("");
  const [channelId, setChannelId] = useState("");

  const searchMutation = trpc.youtube.search.useMutation();
  const videoMutation = trpc.youtube.getVideoDetails.useMutation();
  const commentsMutation = trpc.youtube.getVideoComments.useMutation();
  const transcriptMutation = trpc.youtube.getTranscript.useMutation();
  const channelMutation = trpc.youtube.getChannel.useMutation();

  const handleSubmit = () => {
    if (mode === "search" && query.trim()) {
      searchMutation.mutate({ query: query.trim() });
    } else if (mode === "video" && videoId.trim()) {
      const id = extractVideoId(videoId.trim());
      videoMutation.mutate({ videoId: id });
      commentsMutation.mutate({ videoId: id });
      transcriptMutation.mutate({ videoId: id });
    } else if (mode === "channel" && channelId.trim()) {
      channelMutation.mutate({ channelIdentifier: channelId.trim() });
    }
  };

  const activeMutation = { search: searchMutation, video: videoMutation, channel: channelMutation }[mode];
  const isLoading = activeMutation.isPending || (mode === "video" && (commentsMutation.isPending || transcriptMutation.isPending));

  const searchItems = (searchMutation.data?.output?.data ?? searchMutation.data?.output?.results ?? searchMutation.data?.output?.items) as Record<string, unknown>[] | undefined;
  const videoData = videoMutation.data?.output;
  const comments = (commentsMutation.data?.output?.data ?? commentsMutation.data?.output?.results ?? commentsMutation.data?.output?.items) as Record<string, unknown>[] | undefined;
  const transcript = transcriptMutation.data?.output;
  const channelData = channelMutation.data?.output;
  const channelVideos = (channelMutation.data?.output?.data ?? channelMutation.data?.output?.results ?? channelMutation.data?.output?.items) as Record<string, unknown>[] | undefined;

  return (
    <div className="flex h-full flex-col">
      <Header title="YouTube" description="Search videos, fetch details, transcripts, and channel info" />

      <div className="border-b p-4 space-y-3">
        <div className="flex gap-2">
          <Button variant={mode === "search" ? "default" : "outline"} size="sm" onClick={() => setMode("search")}>
            <Search className="mr-1.5 h-4 w-4" /> Search
          </Button>
          <Button variant={mode === "video" ? "default" : "outline"} size="sm" onClick={() => setMode("video")}>
            <Film className="mr-1.5 h-4 w-4" /> Video Details
          </Button>
          <Button variant={mode === "channel" ? "default" : "outline"} size="sm" onClick={() => setMode("channel")}>
            <User className="mr-1.5 h-4 w-4" /> Channel
          </Button>
        </div>

        <div className="flex gap-3 items-end">
          {mode === "search" && (
            <div className="flex-1 space-y-1.5">
              <Label className="text-xs font-medium">Search Query</Label>
              <Input placeholder='e.g. "SaaS product demo"' value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
          )}
          {mode === "video" && (
            <div className="flex-1 space-y-1.5">
              <Label className="text-xs font-medium">Video URL or ID</Label>
              <Input placeholder="https://youtube.com/watch?v=dQw4w9WgXcQ or just the ID" value={videoId} onChange={(e) => setVideoId(e.target.value)} />
            </div>
          )}
          {mode === "channel" && (
            <div className="flex-1 space-y-1.5">
              <Label className="text-xs font-medium">Channel URL, ID, or Handle</Label>
              <Input placeholder="e.g. @mkbhd or UCBcRF18a7Qf58cCRy5xuWwQ" value={channelId} onChange={(e) => setChannelId(e.target.value)} />
            </div>
          )}
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Youtube className="mr-2 h-4 w-4" />}
            Fetch
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {activeMutation.isError && <ErrorDisplay message={activeMutation.error.message} />}

        {/* Search results */}
        {mode === "search" && searchMutation.isSuccess && (
          <div className="mx-auto max-w-2xl space-y-3">
            {!searchItems?.length && <EmptyState icon={Youtube} title="No results" description="No videos found." />}
            {searchItems?.map((item, i) => (
              <Card key={(item.videoId as string) ?? i} className="cursor-pointer hover:bg-accent/50" onClick={() => {
                const id = (item.videoId as string);
                if (id) { setVideoId(id); setMode("video"); }
              }}>
                <CardContent className="pt-4 space-y-1">
                  <p className="font-medium text-sm">{(item.title as string) ?? "Untitled"}</p>
                  <p className="text-xs text-muted-foreground">{(item.channelTitle as string) ?? ""}</p>
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    {(item.viewCount as number) != null && <span>{(item.viewCount as number).toLocaleString()} views</span>}
                    {(item.publishedAt as string) && <span>{new Date(item.publishedAt as string).toLocaleDateString()}</span>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Video details */}
        {mode === "video" && videoMutation.isSuccess && videoData && (
          <div className="mx-auto max-w-2xl space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base">{(videoData.title as string) ?? "Video"}</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {(videoData.description as string) && (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-6">{videoData.description as string}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  {(videoData.viewCount as number) != null && <Badge variant="outline">{(videoData.viewCount as number).toLocaleString()} views</Badge>}
                  {(videoData.likeCount as number) != null && <Badge variant="outline">{(videoData.likeCount as number).toLocaleString()} likes</Badge>}
                  {(videoData.commentCount as number) != null && <Badge variant="outline">{(videoData.commentCount as number).toLocaleString()} comments</Badge>}
                </div>
              </CardContent>
            </Card>

            {/* Transcript */}
            {transcriptMutation.isSuccess && transcript && (
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" /> Transcript</CardTitle></CardHeader>
                <CardContent>
                  {Array.isArray(transcript.segments) ? (
                    <div className="max-h-64 overflow-y-auto space-y-1 text-sm">
                      {(transcript.segments as Array<Record<string, unknown>>).map((seg, i) => (
                        <p key={i}><span className="text-muted-foreground text-xs font-mono mr-2">{formatTimestamp(seg.start as number)}</span>{seg.text as string}</p>
                      ))}
                    </div>
                  ) : (transcript.transcript as string) ? (
                    <p className="text-sm whitespace-pre-wrap max-h-64 overflow-y-auto">{transcript.transcript as string}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">No transcript available.</p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Comments */}
            {commentsMutation.isSuccess && comments && comments.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Comments ({comments.length})</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {comments.slice(0, 20).map((c, i) => (
                    <div key={i} className="border-b pb-2 last:border-0 last:pb-0">
                      <p className="text-xs font-medium text-muted-foreground">{(c.authorDisplayName as string) ?? (c.author as string) ?? "Anonymous"}</p>
                      <p className="text-sm">{(c.textDisplay as string) ?? (c.text as string) ?? ""}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Channel */}
        {mode === "channel" && channelMutation.isSuccess && channelData && (
          <div className="mx-auto max-w-2xl space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base">{(channelData.title as string) ?? (channelData.name as string) ?? "Channel"}</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {(channelData.description as string) && <p className="text-sm text-muted-foreground line-clamp-3">{channelData.description as string}</p>}
                <div className="flex gap-2">
                  {(channelData.subscriberCount as number) != null && <Badge variant="outline">{(channelData.subscriberCount as number).toLocaleString()} subscribers</Badge>}
                  {(channelData.videoCount as number) != null && <Badge variant="outline">{(channelData.videoCount as number).toLocaleString()} videos</Badge>}
                </div>
              </CardContent>
            </Card>
            {channelVideos && channelVideos.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base">Recent Videos</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {channelVideos.map((v, i) => (
                    <div key={i} className="flex justify-between items-center border-b pb-2 last:border-0 cursor-pointer hover:bg-accent/50 rounded px-2 -mx-2" onClick={() => {
                      const id = (v.videoId as string);
                      if (id) { setVideoId(id); setMode("video"); }
                    }}>
                      <div>
                        <p className="text-sm font-medium">{(v.title as string) ?? "Untitled"}</p>
                        <p className="text-xs text-muted-foreground">{(v.publishedAt as string) ? new Date(v.publishedAt as string).toLocaleDateString() : ""}</p>
                      </div>
                      {(v.viewCount as number) != null && <span className="text-xs text-muted-foreground">{(v.viewCount as number).toLocaleString()} views</span>}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {!activeMutation.isSuccess && !isLoading && !activeMutation.isError && (
          <EmptyState icon={Youtube} title="YouTube" description="Search videos, view details with transcripts, or explore channels." />
        )}
      </div>
    </div>
  );
}

/** Extract video ID from a YouTube URL or return as-is if already an ID. */
function extractVideoId(input: string): string {
  try {
    const url = new URL(input);
    return url.searchParams.get("v") ?? url.pathname.split("/").pop() ?? input;
  } catch {
    return input;
  }
}

function formatTimestamp(seconds: number | undefined | null): string {
  if (seconds == null) return "";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
