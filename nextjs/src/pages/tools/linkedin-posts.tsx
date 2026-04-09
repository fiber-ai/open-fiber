import { useState } from "react";
import { MessageSquare, Search, User, Building2, Loader2, ThumbsUp, MessageCircle, Heart } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorDisplay } from "@/components/shared/error-display";

type Mode = "profile" | "company" | "keywords" | "profile-comments" | "profile-reactions";

interface Post {
  post_id?: string | null;
  // profile/company posts use `caption`, keyword search uses `content`
  caption?: string | null;
  content?: string | null;
  subText?: string | null;
  posted_at?: string | null;
  // profile/company posts use numReactions, keyword search uses numLikes
  numReactions?: number | null;
  numLikes?: number | null;
  numComments?: number | null;
  numShares?: number | null;
  author?: string | { name?: string; linkedinUrl?: string; profilePicture?: string } | null;
}

export default function LinkedInPostsPage() {
  const [mode, setMode] = useState<Mode>("profile");
  const [identifier, setIdentifier] = useState("");
  const [keywords, setKeywords] = useState("");
  const [recency, setRecency] = useState<string>("Month");

  const profilePosts = trpc.linkedin.profilePosts.useMutation();
  const companyPosts = trpc.linkedin.companyPosts.useMutation();
  const keywordSearch = trpc.linkedin.postSearchByKeywords.useMutation();
  const profileComments = trpc.linkedin.profileComments.useMutation();
  const profileReactions = trpc.linkedin.profileReactions.useMutation();

  const handleSearch = () => {
    if (mode === "profile" && identifier.trim()) {
      profilePosts.mutate({ identifier: identifier.trim() });
    } else if (mode === "company" && identifier.trim()) {
      companyPosts.mutate({ identifier: identifier.trim() });
    } else if (mode === "keywords" && keywords.trim()) {
      keywordSearch.mutate({ keywords: keywords.trim(), recency: recency as "Day" | "Week" | "Month" | "Quarter" | "HalfYear" | "Year" });
    } else if (mode === "profile-comments" && identifier.trim()) {
      profileComments.mutate({ identifier: identifier.trim() });
    } else if (mode === "profile-reactions" && identifier.trim()) {
      profileReactions.mutate({ identifier: identifier.trim() });
    }
  };

  const mutationForMode = {
    profile: profilePosts,
    company: companyPosts,
    keywords: keywordSearch,
    "profile-comments": profileComments,
    "profile-reactions": profileReactions,
  }[mode];

  const isLoading = mutationForMode.isPending;
  const activeError = mutationForMode.error;
  // profile/company posts are in output.data, keyword search is in output.posts
  const posts = (mode === "profile"
    ? profilePosts.data?.output?.data
    : mode === "company"
    ? companyPosts.data?.output?.data
    : mode === "profile-comments"
    ? profileComments.data?.output?.data
    : mode === "profile-reactions"
    ? profileReactions.data?.output?.data
    : keywordSearch.data?.output?.posts) ?? [];
  const hasResult = mutationForMode.isSuccess;

  return (
    <div className="flex h-full flex-col">
      <Header title="LinkedIn Posts" description="Fetch posts from profiles, companies, or search by keywords" />

      <div className="border-b p-4 space-y-3">
        <div className="flex gap-2">
          <Button variant={mode === "profile" ? "default" : "outline"} size="sm" onClick={() => setMode("profile")}>
            <User className="mr-1.5 h-4 w-4" /> Profile Posts
          </Button>
          <Button variant={mode === "company" ? "default" : "outline"} size="sm" onClick={() => setMode("company")}>
            <Building2 className="mr-1.5 h-4 w-4" /> Company Posts
          </Button>
          <Button variant={mode === "keywords" ? "default" : "outline"} size="sm" onClick={() => setMode("keywords")}>
            <Search className="mr-1.5 h-4 w-4" /> Keyword Search
          </Button>
          <Button variant={mode === "profile-comments" ? "default" : "outline"} size="sm" onClick={() => setMode("profile-comments")}>
            <MessageCircle className="mr-1.5 h-4 w-4" /> Profile Comments
          </Button>
          <Button variant={mode === "profile-reactions" ? "default" : "outline"} size="sm" onClick={() => setMode("profile-reactions")}>
            <Heart className="mr-1.5 h-4 w-4" /> Profile Reactions
          </Button>
        </div>

        <div className="flex gap-3 items-end">
          {(mode === "profile" || mode === "company" || mode === "profile-comments" || mode === "profile-reactions") && (
            <div className="flex-1 space-y-1.5">
              <Label className="text-xs font-medium">
                {mode === "company" ? "LinkedIn Company URL or Slug" : "LinkedIn Profile URL or Slug"}
              </Label>
              <Input
                placeholder={mode === "company" ? "https://www.linkedin.com/company/name" : "https://www.linkedin.com/in/username"}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
              />
            </div>
          )}
          {mode === "keywords" && (
            <>
              <div className="flex-1 space-y-1.5">
                <Label className="text-xs font-medium">Keywords</Label>
                <Input placeholder="e.g. AI, hiring, product launch" value={keywords} onChange={(e) => setKeywords(e.target.value)} />
              </div>
              <div className="w-40 space-y-1.5">
                <Label className="text-xs font-medium">Recency</Label>
                <select className="w-full rounded-md border bg-background px-2 py-2 text-sm" value={recency} onChange={(e) => setRecency(e.target.value)}>
                  <option value="Day">Past Day</option>
                  <option value="Week">Past Week</option>
                  <option value="Month">Past Month</option>
                  <option value="Quarter">Past Quarter</option>
                  <option value="HalfYear">Past 6 Months</option>
                  <option value="Year">Past Year</option>
                </select>
              </div>
            </>
          )}
          <Button onClick={handleSearch} disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageSquare className="mr-2 h-4 w-4" />}
            Fetch Posts
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {activeError && <ErrorDisplay message={activeError.message} />}

        {posts.length > 0 && (
          <div className="mx-auto max-w-2xl space-y-4">
            {posts.map((post, i) => (
              <Card key={post.post_id ?? i}>
                <CardContent className="pt-4 space-y-2">
                  {post.author && (
                    <p className="text-xs font-medium text-muted-foreground">
                      {typeof post.author === "string" ? post.author : post.author.name ?? "Unknown"}
                    </p>
                  )}
                  <p className="text-sm whitespace-pre-wrap">{post.caption ?? post.content ?? post.subText ?? "(No content)"}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {(post.numReactions ?? post.numLikes) != null && (
                      <span className="flex items-center gap-1"><ThumbsUp className="h-3 w-3" />{post.numReactions ?? post.numLikes}</span>
                    )}
                    {post.numComments != null && (
                      <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" />{post.numComments}</span>
                    )}
                    {post.posted_at && <span>{new Date(post.posted_at).toLocaleDateString()}</span>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {hasResult && posts.length === 0 && (
          <EmptyState icon={MessageSquare} title="No posts found" description="No posts available for this query." />
        )}
        {!hasResult && !isLoading && !activeError && (
          <EmptyState icon={MessageSquare} title="LinkedIn Posts" description="Fetch recent posts from any profile, company, or search by keywords." />
        )}
      </div>
    </div>
  );
}
