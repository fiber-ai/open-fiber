import { useMemo, useState } from "react";
import {
  Utensils, Search, Loader2, MapPin, Phone, Globe, ExternalLink, Navigation, BadgeCheck, Award, ThumbsUp, Laugh, Sparkles, X, ChevronRight,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorDisplay } from "@/components/shared/error-display";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { StarRating, RatingHistogram } from "@/components/shared/star-rating";
import { cn } from "@/lib/utils";

interface Business {
  placeId: string; name: string; url?: string | null; rating?: number | null; reviewCount?: number | null;
  phoneNumber?: string | null; priceLevel?: number | null; categories: string[]; neighborhood?: string | null; thumbnailUrl?: string | null;
}
interface Place {
  placeId: string; name: string; url?: string | null; rating?: number | null; reviewCount?: number | null; isClaimed?: boolean | null;
  priceLevel?: number | null; phoneNumber?: string | null; address?: string | null; websiteUrl?: string | null; directionsUrl?: string | null;
  categories: string[]; neighborhoods: string[]; openingHours: { dayOfWeek: string; hours: string }[];
  services: { name: string; isActive: boolean }[]; imageUrls: string[];
}
interface Review {
  authorName?: string | null; authorLocation?: string | null; authorIsElite?: boolean | null; rating: number; date?: string | null;
  text?: string | null; photoUrls: string[]; usefulCount?: number | null; funnyCount?: number | null; coolCount?: number | null;
}

type ReviewSort = "relevance" | "newestFirst" | "oldestFirst" | "highestRated" | "lowestRated" | "elitesFirst";
const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const price = (n?: number | null) => (n ? "$".repeat(n) : null);

function PlaceDetail({ placeId, onClose }: { placeId: string; onClose: () => void }) {
  const place = trpc.yelp.place.useQuery({ placeId }, { staleTime: 5 * 60_000 });
  const [sortBy, setSortBy] = useState<ReviewSort>("relevance");
  const [ratings, setRatings] = useState<number[]>([]);
  const [keyword, setKeyword] = useState("");
  const [appliedKeyword, setAppliedKeyword] = useState("");

  const reviews = trpc.yelp.reviews.useInfiniteQuery(
    { placeId, sortBy, ratings, keywords: appliedKeyword ? [appliedKeyword] : undefined },
    { getNextPageParam: (last) => ((last.output as { nextPageToken?: string | null }).nextPageToken ?? undefined) },
  );

  const p = place.data?.output.place as Place | undefined;
  const allReviews = useMemo(() => (reviews.data?.pages.flatMap((pg) => (pg.output as { reviews: Review[] }).reviews) ?? []), [reviews.data]);
  const totalReviews = (reviews.data?.pages[0]?.output as { totalReviewCount?: number | null } | undefined)?.totalReviewCount;
  const counts = useMemo(() => {
    const c: Record<number, number> = {};
    for (const r of allReviews) c[Math.round(r.rating)] = (c[Math.round(r.rating)] ?? 0) + 1;
    return c;
  }, [allReviews]);
  const today = DAYS[new Date().getDay()];

  const toggleRating = (s: number) => setRatings((rs) => (rs.includes(s) ? rs.filter((x) => x !== s) : [...rs, s]));

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          {place.isLoading ? <div className="h-6 w-48 animate-pulse rounded bg-muted" /> : (
            <h2 className="flex items-center gap-2 text-xl font-semibold">
              {p?.name}
              {p?.isClaimed && <span title="Claimed by owner"><BadgeCheck className="h-4 w-4 text-sky-500" /></span>}
            </h2>
          )}
          {p && (
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {p.rating != null && <><StarRating value={p.rating} /><span className="tabular-nums">{p.rating.toFixed(1)}</span></>}
              {p.reviewCount != null && <span>({p.reviewCount.toLocaleString()} reviews)</span>}
              {price(p.priceLevel) && <span>· {price(p.priceLevel)}</span>}
              {p.categories.length > 0 && <span>· {p.categories.join(", ")}</span>}
            </div>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close"><X className="h-4 w-4" /></Button>
      </div>

      {place.isError && <ErrorDisplay message={place.error.message} onRetry={() => place.refetch()} />}

      {p && p.imageUrls.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {p.imageUrls.slice(0, 12).map((src) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={src} src={src} alt="" className="h-32 w-44 shrink-0 rounded-md object-cover" loading="lazy" />
          ))}
        </div>
      )}

      {p && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardContent className="space-y-2 pt-4 text-sm">
              {p.address && <p className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />{p.address}</p>}
              {p.neighborhoods.length > 0 && <p className="pl-6 text-xs text-muted-foreground">{p.neighborhoods.join(" · ")}</p>}
              {p.phoneNumber && <p className="flex gap-2"><Phone className="h-4 w-4 text-muted-foreground" />{p.phoneNumber}</p>}
              <div className="flex flex-wrap gap-2 pt-1">
                {p.websiteUrl && <a href={p.websiteUrl} target="_blank" rel="noreferrer"><Button size="sm" variant="outline"><Globe className="mr-1.5 h-3.5 w-3.5" />Website</Button></a>}
                {p.directionsUrl && <a href={p.directionsUrl} target="_blank" rel="noreferrer"><Button size="sm" variant="outline"><Navigation className="mr-1.5 h-3.5 w-3.5" />Directions</Button></a>}
                {p.url && <a href={p.url} target="_blank" rel="noreferrer"><Button size="sm" variant="outline"><ExternalLink className="mr-1.5 h-3.5 w-3.5" />Yelp</Button></a>}
              </div>
              {p.services.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-2">
                  {p.services.map((s) => (
                    <Badge key={s.name} variant={s.isActive ? "secondary" : "outline"} className={cn("font-normal", !s.isActive && "line-through opacity-60")}>{s.name}</Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          {p.openingHours.length > 0 && (
            <Card>
              <CardContent className="pt-4">
                <table className="w-full text-sm">
                  <tbody>
                    {p.openingHours.map((h) => (
                      <tr key={h.dayOfWeek} className={cn(h.dayOfWeek === today && "font-semibold")}>
                        <td className="py-0.5 capitalize">{h.dayOfWeek}</td>
                        <td className="py-0.5 text-right text-muted-foreground">{h.hours}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <div className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h3 className="text-sm font-semibold">Reviews{totalReviews != null && <span className="font-normal text-muted-foreground"> · {totalReviews.toLocaleString()} total</span>}</h3>
          <div className="flex flex-wrap items-center gap-2">
            <Input placeholder="Keyword, e.g. brunch" value={keyword} onChange={(e) => setKeyword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && setAppliedKeyword(keyword.trim())} className="h-8 w-44 text-xs" />
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as ReviewSort)} className="h-8 rounded-md border bg-background px-2 text-xs">
              <option value="relevance">Most relevant</option>
              <option value="newestFirst">Newest</option>
              <option value="oldestFirst">Oldest</option>
              <option value="highestRated">Highest rated</option>
              <option value="lowestRated">Lowest rated</option>
              <option value="elitesFirst">Elites first</option>
            </select>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-[12rem_minmax(0,1fr)]">
          <div className="space-y-2">
            <RatingHistogram counts={counts} active={ratings} onToggle={toggleRating} />
            <p className="text-[11px] text-muted-foreground">Loaded reviews. Click a row to filter by stars.</p>
          </div>
          <div className="space-y-3">
            {reviews.isLoading && <LoadingSkeleton rows={3} />}
            {reviews.isError && <ErrorDisplay message={reviews.error.message} onRetry={() => reviews.refetch()} />}
            {reviews.isSuccess && allReviews.length === 0 && <p className="text-sm text-muted-foreground">No reviews match.</p>}
            {allReviews.map((r, i) => (
              <div key={i} className="space-y-1.5 border-b pb-3 last:border-0">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium">{r.authorName ?? "Anonymous"}</span>
                  {r.authorIsElite && <Badge className="h-5 bg-red-600 px-1.5 text-[10px] hover:bg-red-600"><Award className="mr-0.5 h-3 w-3" />Elite</Badge>}
                  {r.authorLocation && <span className="text-xs text-muted-foreground">{r.authorLocation}</span>}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <StarRating value={r.rating} size="h-3 w-3" />
                  {r.date && <span suppressHydrationWarning>{new Date(r.date).toLocaleDateString()}</span>}
                </div>
                {r.text && <p className="whitespace-pre-line text-sm leading-relaxed">{r.text}</p>}
                {r.photoUrls.length > 0 && (
                  <div className="flex gap-1.5">
                    {r.photoUrls.slice(0, 4).map((src) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={src} src={src} alt="" className="h-16 w-16 rounded object-cover" loading="lazy" />
                    ))}
                  </div>
                )}
                {(r.usefulCount || r.funnyCount || r.coolCount) ? (
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    {!!r.usefulCount && <span className="flex items-center gap-1"><ThumbsUp className="h-3 w-3" />{r.usefulCount}</span>}
                    {!!r.funnyCount && <span className="flex items-center gap-1"><Laugh className="h-3 w-3" />{r.funnyCount}</span>}
                    {!!r.coolCount && <span className="flex items-center gap-1"><Sparkles className="h-3 w-3" />{r.coolCount}</span>}
                  </div>
                ) : null}
              </div>
            ))}
            {reviews.hasNextPage && (
              <Button variant="outline" size="sm" onClick={() => reviews.fetchNextPage()} disabled={reviews.isFetchingNextPage}>
                {reviews.isFetchingNextPage && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}More reviews
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function YelpPage() {
  const [location, setLocation] = useState("");
  const [categories, setCategories] = useState("");
  const [sortBy, setSortBy] = useState<"relevance" | "highestRated" | "mostReviewed">("relevance");
  const [results, setResults] = useState<Business[]>([]);
  const [nextToken, setNextToken] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const search = trpc.yelp.search.useMutation();

  const run = async (append: boolean) => {
    const res = await search.mutateAsync({
      location: location.trim(),
      categories: categories.split(",").map((c) => c.trim()).filter(Boolean),
      sortBy,
      nextPageToken: append ? nextToken : null,
    });
    const out = res.output as { businesses: Business[]; nextPageToken?: string | null };
    setResults((prev) => (append ? [...prev, ...out.businesses] : out.businesses));
    setNextToken(out.nextPageToken ?? null);
    if (!append) setSelected(null);
  };

  return (
    <div className="flex h-full flex-col">
      <Header icon={Utensils} title="Yelp" description="Find local businesses, then dig into details, hours and reviews" />

      <div className="border-b p-4">
        <form className="flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); if (location.trim().length >= 2) run(false).catch(() => {}); }}>
          <div className="flex flex-col gap-1.5"><Label className="text-xs font-medium">Location</Label><Input placeholder="Mission District, San Francisco" value={location} onChange={(e) => setLocation(e.target.value)} className="w-72" /></div>
          <div className="flex flex-col gap-1.5"><Label className="text-xs font-medium">Categories (comma-separated)</Label><Input placeholder="coffee, bakeries" value={categories} onChange={(e) => setCategories(e.target.value)} className="w-56" /></div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium">Sort</Label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} className="h-10 rounded-md border bg-background px-2 text-sm">
              <option value="relevance">Relevance</option>
              <option value="highestRated">Highest rated</option>
              <option value="mostReviewed">Most reviewed</option>
            </select>
          </div>
          <Button type="submit" disabled={search.isPending || location.trim().length < 2}>
            {search.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}Search
          </Button>
        </form>
      </div>

      <div className="flex min-h-0 flex-1">
        <div className={cn("overflow-y-auto p-4", selected ? "hidden w-[26rem] shrink-0 border-r lg:block" : "flex-1")}>
          {search.isError && <ErrorDisplay message={search.error.message} />}
          {!search.isPending && results.length === 0 && !search.isError && (
            <EmptyState icon={Utensils} title={search.isSuccess ? "No businesses found" : "Search Yelp"} description={search.isSuccess ? "Try a broader location or fewer categories." : "Enter a neighborhood or city, optionally with categories like 'tacos' or 'yoga'."} />
          )}
          <div className={cn("grid gap-3", !selected && "sm:grid-cols-2 xl:grid-cols-3")}>
            {results.map((b) => (
              <button key={b.placeId} type="button" onClick={() => setSelected(b.placeId)} className="text-left">
                <Card className={cn("h-full transition-colors hover:border-primary/50", selected === b.placeId && "border-primary")}>
                  <CardContent className="flex gap-3 p-3">
                    {b.thumbnailUrl
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={b.thumbnailUrl} alt="" className="h-20 w-20 shrink-0 rounded-md object-cover" loading="lazy" />
                      : <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-md bg-muted"><Utensils className="h-6 w-6 text-muted-foreground" /></div>}
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="flex items-center justify-between gap-1 font-medium leading-tight">
                        <span className="truncate">{b.name}</span><ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                      </p>
                      {b.rating != null && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <StarRating value={b.rating} size="h-3 w-3" />
                          <span className="tabular-nums">{b.reviewCount?.toLocaleString() ?? 0}</span>
                          {price(b.priceLevel) && <span>· {price(b.priceLevel)}</span>}
                        </div>
                      )}
                      <p className="truncate text-xs text-muted-foreground">{[b.neighborhood, ...b.categories].filter(Boolean).join(" · ")}</p>
                      {b.phoneNumber && <p className="text-xs text-muted-foreground">{b.phoneNumber}</p>}
                    </div>
                  </CardContent>
                </Card>
              </button>
            ))}
          </div>
          {nextToken && results.length > 0 && (
            <div className="mt-4 flex justify-center">
              <Button variant="outline" onClick={() => run(true).catch(() => {})} disabled={search.isPending}>
                {search.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Load more
              </Button>
            </div>
          )}
        </div>
        {selected && (
          <div className="min-w-0 flex-1 overflow-y-auto p-6">
            <PlaceDetail key={selected} placeId={selected} onClose={() => setSelected(null)} />
          </div>
        )}
      </div>
    </div>
  );
}
