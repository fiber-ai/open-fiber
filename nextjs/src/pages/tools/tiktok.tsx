import { useEffect, useState } from "react";
import {
  Music2, Search, User, Video, Loader2, ExternalLink, Heart, MessageCircle, Share2, Eye, BadgeCheck, Flame, Disc3, Hash, FileText, Clock, Users,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorDisplay } from "@/components/shared/error-display";
import { ToggleButtonGroup } from "@/components/shared/toggle-button-group";
import { cn } from "@/lib/utils";

type Mode = "profile" | "search" | "video" | "trending" | "song";
type SearchKind = "all" | "keyword" | "hashtag" | "users";
type Row = Record<string, unknown>;

const str = (o: Row | undefined, ...keys: string[]): string | undefined => {
  for (const k of keys) { const v = o?.[k]; if (typeof v === "string" && v) return v; }
  return undefined;
};
const num = (o: Row | undefined, ...keys: string[]): number | undefined => {
  for (const k of keys) { const v = o?.[k]; if (typeof v === "number") return v; }
  return undefined;
};
const compact = (n?: number) => (n == null ? "—" : new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(n));
const dur = (s?: number) => (s == null ? "" : `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`);
const songUrlOf = (s: Row) => {
  const id = str(s, "id");
  if (!id) return null;
  const slug = (str(s, "title") ?? "song").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "song";
  return `https://www.tiktok.com/music/${slug}-${id}`;
};
const engagement = (v: Row) => {
  const views = num(v, "viewCount");
  if (!views) return null;
  return (((num(v, "likeCount") ?? 0) + (num(v, "commentCount") ?? 0) + (num(v, "shareCount") ?? 0)) / views) * 100;
};

/** Accumulates token-paginated results from one of the TikTok mutations. */
// Any of the paginated tRPC mutations; `never` input lets each keep its own input type.
interface PagedMutation { mutateAsync: (input: never) => Promise<unknown>; isPending: boolean; error: { message: string } | null }

function usePaged<I extends object>(mut: PagedMutation, key: "videos" | "users" | "comments") {
  const [items, setItems] = useState<Row[]>([]);
  const [extra, setExtra] = useState<Row[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [args, setArgs] = useState<I | null>(null);
  const [loaded, setLoaded] = useState(false);
  const run = async (a: I, append = false) => {
    const res = (await mut.mutateAsync({ ...a, nextPageToken: append ? token : null } as never)) as { output: Row };
    const out = res.output;
    setItems((prev) => (append ? [...prev, ...((out[key] ?? []) as Row[])] : ((out[key] ?? []) as Row[])));
    if (key === "videos") setExtra((prev) => (append ? [...prev, ...((out.users ?? []) as Row[])] : ((out.users ?? []) as Row[])));
    setToken((out.nextPageToken as string | null) ?? null);
    setArgs(a);
    setLoaded(true);
  };
  return { items, extra, loaded, hasMore: !!token, pending: mut.isPending, error: mut.error, run: (a: I) => run(a).catch(() => {}), more: () => args && run(args, true).catch(() => {}), reset: () => { setItems([]); setExtra([]); setToken(null); setLoaded(false); } };
}

function MoreButton({ show, pending, onClick }: { show: boolean; pending: boolean; onClick: () => void }) {
  if (!show) return null;
  return <div className="flex justify-center pt-2"><Button variant="outline" size="sm" onClick={onClick} disabled={pending}>{pending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}Load more</Button></div>;
}

function VideoGrid({ videos, onOpen }: { videos: Row[]; onOpen: (url: string) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {videos.map((v, i) => {
        const url = str(v, "videoUrl", "url");
        const eng = engagement(v);
        return (
          <button key={str(v, "id") ?? i} type="button" disabled={!url} onClick={() => url && onOpen(url)} className="group text-left">
            <div className="relative aspect-[9/16] overflow-hidden rounded-lg bg-muted">
              {str(v, "thumbnailUrl")
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={str(v, "thumbnailUrl")} alt="" className="h-full w-full object-cover transition-transform group-hover:scale-105" loading="lazy" />
                : <div className="flex h-full items-center justify-center"><Video className="h-8 w-8 text-muted-foreground" /></div>}
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/70 to-transparent p-2 text-[11px] font-medium text-white">
                <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{compact(num(v, "viewCount"))}</span>
                {num(v, "durationSeconds") != null && <span>{dur(num(v, "durationSeconds"))}</span>}
              </div>
              {eng != null && eng >= 10 && <span className="absolute left-2 top-2 rounded bg-rose-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">{eng.toFixed(0)}% eng.</span>}
            </div>
            <p className="mt-1.5 line-clamp-2 text-xs">{str(v, "caption") ?? "(no caption)"}</p>
            <p className="mt-0.5 flex gap-2 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-0.5"><Heart className="h-3 w-3" />{compact(num(v, "likeCount"))}</span>
              <span className="flex items-center gap-0.5"><MessageCircle className="h-3 w-3" />{compact(num(v, "commentCount"))}</span>
            </p>
          </button>
        );
      })}
    </div>
  );
}

function UserList({ users, onOpen }: { users: Row[]; onOpen: (handle: string) => void }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {users.map((u, i) => (
        <button key={str(u, "id") ?? i} type="button" onClick={() => str(u, "handle") && onOpen(str(u, "handle")!)} className="text-left">
          <Card className="transition-colors hover:border-primary/50">
            <CardContent className="flex items-center gap-3 p-3">
              {str(u, "profileImageUrl")
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={str(u, "profileImageUrl")} alt="" className="h-10 w-10 rounded-full object-cover" loading="lazy" />
                : <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted"><User className="h-4 w-4 text-muted-foreground" /></div>}
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1 truncate text-sm font-medium">@{str(u, "handle") ?? "unknown"}{u.isVerified === true && <BadgeCheck className="h-3.5 w-3.5 text-sky-500" />}</p>
                <p className="truncate text-xs text-muted-foreground">{str(u, "displayName")}{num(u, "followerCount") != null && ` · ${compact(num(u, "followerCount"))} followers`}</p>
              </div>
            </CardContent>
          </Card>
        </button>
      ))}
    </div>
  );
}

/** Views of the most recent videos as bars — spots breakout posts at a glance. */
function ViewsChart({ videos }: { videos: Row[] }) {
  const vs = videos.slice(0, 24).filter((v) => num(v, "viewCount") != null).reverse();
  if (vs.length < 3) return null;
  const max = Math.max(...vs.map((v) => num(v, "viewCount")!));
  const median = [...vs.map((v) => num(v, "viewCount")!)].sort((a, b) => a - b)[Math.floor(vs.length / 2)];
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">Views on recent videos <span className="font-normal text-muted-foreground">· median {compact(median)}</span></CardTitle></CardHeader>
      <CardContent>
        <div className="flex h-28 items-end gap-1">
          {vs.map((v, i) => {
            const n = num(v, "viewCount")!;
            return <div key={i} className={cn("flex-1 rounded-t", n > median * 3 ? "bg-rose-500" : "bg-primary/70")} style={{ height: `${Math.max(2, (n / max) * 100)}%` }} title={`${compact(n)} views · ${str(v, "caption")?.slice(0, 60) ?? ""}`} />;
          })}
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">Oldest → newest. Red bars are over 3× the median.</p>
      </CardContent>
    </Card>
  );
}

function Comments({ videoUrl }: { videoUrl: string }) {
  const comments = usePaged<{ videoUrl: string }>(trpc.tiktok.videoComments.useMutation(), "comments");
  const replies = trpc.tiktok.commentReplies.useMutation();
  const [open, setOpen] = useState<Record<string, Row[]>>({});
  const loadReplies = async (id: string) => {
    const r = await replies.mutateAsync({ videoUrl, commentId: id });
    setOpen((o) => ({ ...o, [id]: ((r.output.comments ?? []) as Row[]) }));
  };
  if (!comments.loaded && !comments.pending) return <Button variant="outline" size="sm" onClick={() => comments.run({ videoUrl })}><MessageCircle className="mr-1.5 h-3.5 w-3.5" />Load comments</Button>;
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">Comments</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {comments.error && <p className="text-sm text-destructive">{comments.error.message}</p>}
        {comments.items.map((c, i) => {
          const user = c.user as Row | undefined;
          const id = str(c, "id");
          const rc = num(c, "replyCount") ?? 0;
          return (
            <div key={id ?? i} className="space-y-1 border-b pb-2 last:border-0">
              <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground">@{str(user, "handle") ?? "user"}{user?.isVerified === true && <BadgeCheck className="h-3 w-3 text-sky-500" />}</p>
              <p className="text-sm">{str(c, "text")}</p>
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-0.5"><Heart className="h-3 w-3" />{compact(num(c, "likeCount"))}</span>
                {rc > 0 && id && !open[id] && (
                  <button type="button" className="text-primary hover:underline" onClick={() => loadReplies(id).catch(() => {})} disabled={replies.isPending}>
                    {replies.isPending && replies.variables?.commentId === id ? "Loading…" : `View ${rc} ${rc === 1 ? "reply" : "replies"}`}
                  </button>
                )}
              </div>
              {id && open[id] && (
                <div className="ml-4 space-y-1.5 border-l pl-3">
                  {open[id].map((r, j) => (
                    <div key={j}>
                      <p className="text-[11px] font-medium text-muted-foreground">@{str(r.user as Row, "handle") ?? "user"}</p>
                      <p className="text-xs">{str(r, "text")}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        <MoreButton show={comments.hasMore} pending={comments.pending} onClick={comments.more} />
      </CardContent>
    </Card>
  );
}

function VideoView({ url }: { url: string }) {
  const details = trpc.tiktok.videoDetails.useMutation();
  const transcript = trpc.tiktok.videoTranscript.useMutation();
  useEffect(() => {
    details.mutate({ videoUrl: url });
    transcript.reset();
    // Re-fetch only when the URL changes; mutation objects are stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);
  const v = details.data?.output as Row | undefined;
  const eng = v ? engagement(v) : null;
  const segs = ((transcript.data?.output.segments ?? []) as { text: string; startSeconds?: number | null }[]);
  const lang = transcript.data?.output.language as { name: string } | null | undefined;
  return (
    <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-[16rem_1fr]">
      <div className="space-y-3">
        <div className="relative aspect-[9/16] overflow-hidden rounded-lg bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {str(v, "thumbnailUrl") && <img src={str(v, "thumbnailUrl")} alt="" className="h-full w-full object-cover" />}
          {details.isPending && <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}
        </div>
        <a href={url} target="_blank" rel="noreferrer"><Button variant="outline" size="sm" className="w-full"><ExternalLink className="mr-1.5 h-3.5 w-3.5" />Open on TikTok</Button></a>
      </div>
      <div className="space-y-4">
        {details.isError && <ErrorDisplay message={details.error.message} />}
        {v && (
          <Card>
            <CardContent className="space-y-3 pt-5">
              <p className="text-sm">{str(v, "caption") ?? "(no caption)"}</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                {[["Views", num(v, "viewCount"), Eye], ["Likes", num(v, "likeCount"), Heart], ["Comments", num(v, "commentCount"), MessageCircle], ["Shares", num(v, "shareCount"), Share2]].map(([l, n, I]) => {
                  const Icon = I as typeof Eye;
                  return <div key={l as string}><p className="flex items-center gap-1 text-[11px] text-muted-foreground"><Icon className="h-3 w-3" />{l as string}</p><p className="text-lg font-semibold tabular-nums">{compact(n as number | undefined)}</p></div>;
                })}
                <div><p className="text-[11px] text-muted-foreground">Engagement</p><p className="text-lg font-semibold tabular-nums">{eng == null ? "—" : `${eng.toFixed(1)}%`}</p></div>
              </div>
              <p className="flex gap-3 text-xs text-muted-foreground">
                {num(v, "durationSeconds") != null && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{dur(num(v, "durationSeconds"))}</span>}
                {str(v, "publishedAt") && <span suppressHydrationWarning>Posted {new Date(str(v, "publishedAt")!).toLocaleDateString()}</span>}
              </p>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Transcript{lang && <span className="font-normal text-muted-foreground"> · {lang.name}</span>}</CardTitle>
            {!transcript.data && <Button size="sm" variant="outline" onClick={() => transcript.mutate({ videoUrl: url })} disabled={transcript.isPending}>{transcript.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <FileText className="mr-1.5 h-3.5 w-3.5" />}Get transcript · 2 cr</Button>}
          </CardHeader>
          <CardContent>
            {transcript.isError && <p className="text-sm text-destructive">{transcript.error.message}</p>}
            {transcript.isSuccess && segs.length === 0 && <p className="text-sm text-muted-foreground">No speech found in this video.</p>}
            {segs.length > 0 && (
              <div className="max-h-72 space-y-1 overflow-y-auto">
                {segs.map((s, i) => <p key={i} className="text-sm"><span className="mr-2 font-mono text-[11px] text-muted-foreground">{dur(s.startSeconds ?? 0)}</span>{s.text}</p>)}
              </div>
            )}
          </CardContent>
        </Card>
        <Comments key={url} videoUrl={url} />
      </div>
    </div>
  );
}

export default function TikTokPage() {
  const [mode, setMode] = useState<Mode>("profile");
  const [searchKind, setSearchKind] = useState<SearchKind>("all");
  const [handle, setHandle] = useState("");
  const [query, setQuery] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [songUrl, setSongUrl] = useState("");
  const [openVideo, setOpenVideo] = useState<string | null>(null);
  const [profileTab, setProfileTab] = useState<"videos" | "followers" | "following">("videos");

  const profile = trpc.tiktok.profile.useMutation();
  const userVideos = usePaged<{ handle: string }>(trpc.tiktok.userVideos.useMutation(), "videos");
  const followers = usePaged<{ handle: string }>(trpc.tiktok.userFollowers.useMutation(), "users");
  const following = usePaged<{ handle: string }>(trpc.tiktok.userFollowing.useMutation(), "users");
  const unified = usePaged<{ query: string }>(trpc.tiktok.unifiedSearch.useMutation(), "videos");
  const keyword = usePaged<{ query: string }>(trpc.tiktok.searchKeyword.useMutation(), "videos");
  const hashtag = usePaged<{ query: string }>(trpc.tiktok.searchHashtag.useMutation(), "videos");
  const users = usePaged<{ query: string }>(trpc.tiktok.searchUsers.useMutation(), "users");
  const trending = usePaged<Record<string, never>>(trpc.tiktok.trendingFeed.useMutation(), "videos");
  const songs = trpc.tiktok.popularSongs.useMutation();
  const song = trpc.tiktok.songDetails.useMutation();
  const songVideos = usePaged<{ songUrl: string }>(trpc.tiktok.songVideos.useMutation(), "videos");

  const searchers = { all: unified, keyword, hashtag, users };
  const activeSearch = searchers[searchKind];

  const goVideo = (u: string) => { setVideoUrl(u); setOpenVideo(u); setMode("video"); };
  const goProfile = (h: string) => { setHandle(h); setMode("profile"); loadProfile(h); };
  const goSong = (u: string) => { setSongUrl(u); setMode("song"); song.mutate({ songUrl: u }); songVideos.run({ songUrl: u }); };

  function loadProfile(h: string) {
    setProfileTab("videos"); followers.reset(); following.reset();
    profile.mutate({ handle: h }); userVideos.run({ handle: h });
  }

  const submit = () => {
    if (mode === "profile" && handle.trim()) loadProfile(handle.trim().replace(/^@/, ""));
    else if (mode === "search" && query.trim()) activeSearch.run({ query: query.trim() });
    else if (mode === "video" && videoUrl.trim()) setOpenVideo(videoUrl.trim());
    else if (mode === "song" && songUrl.trim()) goSong(songUrl.trim());
    else if (mode === "trending") { trending.run({}); songs.mutate(); }
  };

  const p = profile.data?.output as Row | undefined;
  const pending = profile.isPending || activeSearch.pending || trending.pending || songs.isPending || song.isPending;

  return (
    <div className="flex h-full flex-col">
      <Header icon={Music2} title="TikTok" description="Profiles, search, video deep-dives with transcripts, trending feed and sounds" />
      <div className="space-y-3 border-b p-4">
        <ToggleButtonGroup<Mode>
          value={mode}
          onChange={setMode}
          options={[
            { value: "profile", label: "Profile", icon: User },
            { value: "search", label: "Search", icon: Search },
            { value: "video", label: "Video", icon: Video },
            { value: "trending", label: "Trending", icon: Flame },
            { value: "song", label: "Sound", icon: Disc3 },
          ]}
        />
        <form className="flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          {mode === "profile" && <div className="flex w-72 flex-col gap-1.5"><Label className="text-xs font-medium">Handle</Label><Input placeholder="nasa" value={handle} onChange={(e) => setHandle(e.target.value)} /></div>}
          {mode === "search" && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium">Search</Label>
                <ToggleButtonGroup<SearchKind> value={searchKind} onChange={setSearchKind} options={[{ value: "all", label: "Everything" }, { value: "keyword", label: "Videos", icon: Video }, { value: "hashtag", label: "Hashtag", icon: Hash }, { value: "users", label: "Users", icon: Users }]} />
              </div>
              <div className="flex min-w-[16rem] flex-1 flex-col gap-1.5"><Label className="text-xs font-medium">Query</Label><Input placeholder={searchKind === "hashtag" ? "#booktok" : "product launch"} value={query} onChange={(e) => setQuery(e.target.value)} /></div>
            </>
          )}
          {mode === "video" && <div className="flex min-w-[20rem] flex-1 flex-col gap-1.5"><Label className="text-xs font-medium">Video URL</Label><Input placeholder="https://www.tiktok.com/@user/video/123…" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} /></div>}
          {mode === "song" && <div className="flex min-w-[20rem] flex-1 flex-col gap-1.5"><Label className="text-xs font-medium">Sound URL</Label><Input placeholder="https://www.tiktok.com/music/song-title-7439295283975702544" value={songUrl} onChange={(e) => setSongUrl(e.target.value)} /></div>}
          {mode === "trending" && <p className="pb-2 text-sm text-muted-foreground">What&apos;s trending on TikTok right now, plus the most-used sounds.</p>}
          <Button type="submit" disabled={pending}>{pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Music2 className="mr-2 h-4 w-4" />}{mode === "trending" ? "Load trending" : "Fetch"}</Button>
        </form>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {mode === "profile" && (
          <div className="mx-auto max-w-6xl space-y-4">
            {profile.isError && <ErrorDisplay message={profile.error.message} />}
            {p && (
              <Card>
                <CardContent className="flex flex-wrap items-center gap-4 pt-5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {str(p, "profileImageUrl", "avatarUrl") && <img src={str(p, "profileImageUrl", "avatarUrl")} alt="" className="h-16 w-16 rounded-full object-cover" />}
                  <div className="min-w-0 flex-1">
                    <a href={`https://www.tiktok.com/@${str(p, "handle") ?? handle}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 font-semibold hover:underline">@{str(p, "handle") ?? handle}{p.isVerified === true && <BadgeCheck className="h-4 w-4 text-sky-500" />}<ExternalLink className="h-3.5 w-3.5 text-muted-foreground" /></a>
                    {str(p, "nickname", "displayName") && <p className="text-sm">{str(p, "nickname", "displayName")}</p>}
                    {str(p, "signature", "bio") && <p className="whitespace-pre-wrap text-sm text-muted-foreground">{str(p, "signature", "bio")}</p>}
                  </div>
                  <div className="flex gap-6 text-center">
                    {[["Followers", num(p, "followerCount")], ["Following", num(p, "followingCount")], ["Likes", num(p, "totalLikeCount", "likeCount", "heartCount")], ["Videos", num(p, "videoCount")]].map(([l, n]) => n != null && (
                      <div key={l as string}><p className="text-lg font-semibold tabular-nums">{compact(n as number)}</p><p className="text-[11px] text-muted-foreground">{l as string}</p></div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            {userVideos.loaded && (
              <>
                <ToggleButtonGroup<typeof profileTab>
                  value={profileTab}
                  onChange={(t) => {
                    setProfileTab(t);
                    const h = str(p, "handle") ?? handle.trim().replace(/^@/, "");
                    if (t === "followers" && !followers.loaded) followers.run({ handle: h });
                    if (t === "following" && !following.loaded) following.run({ handle: h });
                  }}
                  options={[{ value: "videos", label: "Videos", icon: Video }, { value: "followers", label: "Followers", icon: Users }, { value: "following", label: "Following", icon: User }]}
                />
                {profileTab === "videos" && (
                  <div className="space-y-4">
                    <ViewsChart videos={userVideos.items} />
                    <VideoGrid videos={userVideos.items} onOpen={goVideo} />
                    <MoreButton show={userVideos.hasMore} pending={userVideos.pending} onClick={userVideos.more} />
                  </div>
                )}
                {profileTab !== "videos" && (() => {
                  const list = profileTab === "followers" ? followers : following;
                  return (
                    <div className="space-y-3">
                      {list.error && <ErrorDisplay message={list.error.message} />}
                      {list.pending && !list.loaded && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
                      <UserList users={list.items} onOpen={goProfile} />
                      <MoreButton show={list.hasMore} pending={list.pending} onClick={list.more} />
                    </div>
                  );
                })()}
              </>
            )}
            {!p && !profile.isPending && !profile.isError && <EmptyState icon={User} title="Look up a creator" description="Enter a handle to see their stats, a views chart of recent posts, and who follows them." />}
          </div>
        )}

        {mode === "search" && (
          <div className="mx-auto max-w-6xl space-y-6">
            {activeSearch.error && <ErrorDisplay message={activeSearch.error.message} />}
            {searchKind === "all" && unified.extra.length > 0 && <section className="space-y-2"><h2 className="text-sm font-semibold">Accounts</h2><UserList users={unified.extra.slice(0, 6)} onOpen={goProfile} /></section>}
            {searchKind === "users"
              ? <UserList users={users.items} onOpen={goProfile} />
              : activeSearch.items.length > 0 && <section className="space-y-2">{searchKind === "all" && <h2 className="text-sm font-semibold">Videos</h2>}<VideoGrid videos={activeSearch.items} onOpen={goVideo} /></section>}
            {activeSearch.loaded && activeSearch.items.length === 0 && activeSearch.extra.length === 0 && <EmptyState icon={Search} title="Nothing found" description="Try a different query." />}
            <MoreButton show={activeSearch.hasMore} pending={activeSearch.pending} onClick={activeSearch.more} />
            {!activeSearch.loaded && !activeSearch.pending && <EmptyState icon={Search} title="Search TikTok" description="Everything returns videos and accounts together; or narrow to videos, a hashtag, or users." />}
          </div>
        )}

        {mode === "video" && (openVideo ? <VideoView url={openVideo} /> : <EmptyState icon={Video} title="Inspect a video" description="Paste a video URL for stats, engagement rate, transcript and threaded comments. Or click any video elsewhere on this page." />)}

        {mode === "trending" && (
          <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1fr_18rem]">
            <section className="space-y-3">
              {trending.error && <ErrorDisplay message={trending.error.message} />}
              {trending.items.length > 0 && <h2 className="flex items-center gap-1.5 text-sm font-semibold"><Flame className="h-4 w-4 text-rose-500" />Trending now</h2>}
              <VideoGrid videos={trending.items} onOpen={goVideo} />
              <MoreButton show={trending.hasMore} pending={trending.pending} onClick={trending.more} />
              {!trending.loaded && !trending.pending && <EmptyState icon={Flame} title="Trending feed" description="Load the current trending feed and the most popular sounds." />}
            </section>
            {songs.data && (
              <section className="space-y-2">
                <h2 className="flex items-center gap-1.5 text-sm font-semibold"><Disc3 className="h-4 w-4" />Popular sounds</h2>
                {((songs.data.output.songs ?? []) as Row[]).map((s, i) => {
                  const u = songUrlOf(s);
                  return (
                    <button key={str(s, "id") ?? i} type="button" disabled={!u} onClick={() => u && goSong(u)} className="flex w-full items-center gap-2 rounded-md p-1.5 text-left hover:bg-muted">
                      <span className="w-5 text-right text-xs tabular-nums text-muted-foreground">{i + 1}</span>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {str(s, "coverImageUrl") ? <img src={str(s, "coverImageUrl")} alt="" className="h-9 w-9 rounded object-cover" /> : <div className="flex h-9 w-9 items-center justify-center rounded bg-muted"><Disc3 className="h-4 w-4 text-muted-foreground" /></div>}
                      <span className="min-w-0 flex-1"><span className="block truncate text-sm">{str(s, "title")}</span><span className="block truncate text-[11px] text-muted-foreground">{str(s, "artist")}{num(s, "videoCount") != null && ` · ${compact(num(s, "videoCount"))} videos`}</span></span>
                    </button>
                  );
                })}
              </section>
            )}
          </div>
        )}

        {mode === "song" && (
          <div className="mx-auto max-w-6xl space-y-4">
            {song.isError && <ErrorDisplay message={song.error.message} />}
            {song.data && (() => {
              const s = song.data.output as Row;
              return (
                <Card>
                  <CardContent className="flex items-center gap-4 pt-5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {str(s, "coverImageUrl") ? <img src={str(s, "coverImageUrl")} alt="" className="h-20 w-20 rounded-md object-cover" /> : <div className="flex h-20 w-20 items-center justify-center rounded-md bg-muted"><Disc3 className="h-8 w-8 text-muted-foreground" /></div>}
                    <div>
                      <p className="text-lg font-semibold">{str(s, "title")}</p>
                      <p className="text-sm text-muted-foreground">{str(s, "artist")}{num(s, "durationSeconds") != null && ` · ${dur(num(s, "durationSeconds"))}`}</p>
                      {num(s, "videoCount") != null && <p className="mt-1 text-sm"><span className="font-semibold">{compact(num(s, "videoCount"))}</span> videos use this sound</p>}
                    </div>
                  </CardContent>
                </Card>
              );
            })()}
            <VideoGrid videos={songVideos.items} onOpen={goVideo} />
            <MoreButton show={songVideos.hasMore} pending={songVideos.pending} onClick={songVideos.more} />
            {!song.data && !song.isPending && <EmptyState icon={Disc3} title="Look up a sound" description="Paste a TikTok music URL, or pick one from Trending, to see the videos using it." />}
          </div>
        )}
      </div>
    </div>
  );
}
