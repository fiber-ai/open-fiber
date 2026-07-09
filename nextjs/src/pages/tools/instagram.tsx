import { useState } from "react";
import { Instagram, Loader2, ExternalLink, Heart, MessageCircle } from "lucide-react";
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
import { FiberAvatar } from "@/components/shared/fiber-avatar";

type Tab = "posts" | "reels";
type Row = Record<string, unknown>;

const str = (o: Row, ...keys: string[]): string | undefined => {
  for (const k of keys) { const v = o[k]; if (typeof v === "string" && v) return v; }
  return undefined;
};
const num = (o: Row, ...keys: string[]): number | undefined => {
  for (const k of keys) { const v = o[k]; if (typeof v === "number") return v; }
  return undefined;
};
const mediaUrl = (o: Row): string | undefined => {
  const url = str(o, "url", "postUrl");
  if (url) return url;
  const sc = str(o, "shortcode", "code");
  return sc ? `https://www.instagram.com/p/${sc}/` : undefined;
};

export default function InstagramPage() {
  const [handle, setHandle] = useState("");
  const [tab, setTab] = useState<Tab>("posts");

  const profile = trpc.instagram.profile.useMutation();
  const posts = trpc.instagram.userPosts.useMutation();
  const reels = trpc.instagram.userReels.useMutation();

  const handleSubmit = () => {
    const h = handle.trim();
    if (!h) return;
    profile.mutate({ handle: h });
    posts.mutate({ handle: h });
    reels.mutate({ handle: h });
  };

  const p = profile.data?.output as Row | undefined;
  const items = ((tab === "posts" ? posts.data?.output?.posts : reels.data?.output?.reels ?? reels.data?.output?.posts) ?? []) as Row[];
  const isLoading = profile.isPending || posts.isPending || reels.isPending;

  return (
    <div className="flex h-full flex-col">
      <Header icon={Instagram} title="Instagram" description="Fetch a profile with its posts and reels" />

      <div className="border-b p-4">
        <div className="flex gap-3 items-end">
          <div className="flex-1 max-w-sm space-y-1.5">
            <Label className="text-xs font-medium">Instagram Handle</Label>
            <Input placeholder="e.g. nasa" value={handle} onChange={(e) => setHandle(e.target.value)} />
          </div>
          <Button onClick={handleSubmit} disabled={!handle.trim() || isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Instagram className="mr-2 h-4 w-4" />}
            Fetch
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {profile.isError && <ErrorDisplay message={profile.error.message} />}

        {profile.isSuccess && p && (
          <div className="mx-auto max-w-3xl space-y-4">
            <Card>
              <CardContent className="pt-6 flex items-start gap-4">
                <FiberAvatar
                  type="person"
                  size="lg"
                  className="h-16 w-16"
                  src={str(p, "profilePicUrl", "profile_pic_url", "profilePic")}
                  alt={str(p, "username", "handle") ?? handle}
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <a href={`https://www.instagram.com/${str(p, "username", "handle") ?? handle}/`} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline flex items-center gap-1">
                      @{str(p, "username", "handle") ?? handle} <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                    {(p.isVerified === true) && <Badge variant="secondary" className="text-xs">Verified</Badge>}
                  </div>
                  {str(p, "fullName", "full_name") && <p className="text-sm font-medium">{str(p, "fullName", "full_name")}</p>}
                  {str(p, "biography", "bio") && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{str(p, "biography", "bio")}</p>}
                  <div className="flex gap-4 text-sm pt-1">
                    {num(p, "followerCount", "followers_count") != null && <span><strong>{num(p, "followerCount", "followers_count")!.toLocaleString()}</strong> followers</span>}
                    {num(p, "followingCount", "following_count") != null && <span><strong>{num(p, "followingCount", "following_count")!.toLocaleString()}</strong> following</span>}
                    {num(p, "postsCount", "posts_count", "mediaCount") != null && <span><strong>{num(p, "postsCount", "posts_count", "mediaCount")!.toLocaleString()}</strong> posts</span>}
                  </div>
                </div>
              </CardContent>
            </Card>

            <ToggleButtonGroup
              options={[
                { value: "posts" as Tab, label: "Posts", icon: Instagram },
                { value: "reels" as Tab, label: "Reels", icon: Instagram },
              ]}
              value={tab}
              onChange={(v) => setTab(v as Tab)}
            />

            {items.length === 0 ? (
              <EmptyState icon={Instagram} title="No media" description={`No ${tab} found for this profile.`} />
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {items.map((it, i) => {
                  const url = mediaUrl(it);
                  return (
                    <a key={str(it, "shortcode", "id") ?? i} href={url} target="_blank" rel="noopener noreferrer" className="block rounded-md border overflow-hidden hover:bg-accent/50">
                      {str(it, "thumbnailUrl", "displayUrl", "display_url") && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={str(it, "thumbnailUrl", "displayUrl", "display_url")} alt="" className="aspect-square w-full object-cover" />
                      )}
                      <div className="p-2 space-y-1">
                        {str(it, "caption") && <p className="text-xs line-clamp-2">{str(it, "caption")}</p>}
                        <div className="flex gap-3 text-xs text-muted-foreground">
                          {num(it, "likeCount", "like_count") != null && <span className="flex items-center gap-1"><Heart className="h-3 w-3" />{num(it, "likeCount", "like_count")!.toLocaleString()}</span>}
                          {num(it, "commentCount", "comment_count") != null && <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" />{num(it, "commentCount", "comment_count")!.toLocaleString()}</span>}
                        </div>
                      </div>
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {!profile.data && !isLoading && !profile.isError && (
          <EmptyState icon={Instagram} title="Instagram profile lookup" description="Enter a handle to fetch the profile with its posts and reels." />
        )}
      </div>
    </div>
  );
}
