import { useMemo, useState } from "react";
import { MapPin, Search, Loader2, Phone, Globe, ExternalLink, X, ChevronRight, ThumbsUp, Award, Clock } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorDisplay } from "@/components/shared/error-display";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { CopyButton } from "@/components/shared/copy-button";
import { StarRating, RatingHistogram } from "@/components/shared/star-rating";
import { cn } from "@/lib/utils";

interface Hours { dayOfWeek: string; hours: string }
interface Place {
  placeId: string; name: string; url: string; rating?: number | null; reviewCount?: number | null; phoneNumber?: string | null;
  websiteUrl?: string | null; address?: string | null; categories: string[]; openingHours: Hours[]; thumbnailUrl?: string | null;
  coordinates?: { latitude: number; longitude: number } | null;
}
interface PlaceDetailT extends Place {
  description?: string | null;
  ratingBreakdown: { stars: number; count: number }[];
  attributes: { category: string; values: string[] }[];
}
interface Review {
  authorName?: string | null; authorIsLocalGuide?: boolean | null; rating?: number | null; publishedAt?: string | null;
  text?: string | null; likeCount?: number | null; photoUrls: string[]; reviewUrl?: string | null;
}

const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function ReviewItem({ r }: { r: Review }) {
  return (
    <div className="space-y-1.5 border-b pb-3 last:border-0">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-medium">{r.authorName ?? "Anonymous"}</span>
        {r.authorIsLocalGuide && <Badge variant="outline" className="h-5 px-1.5 text-[10px]"><Award className="mr-0.5 h-3 w-3 text-amber-500" />Local Guide</Badge>}
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {r.rating != null && <StarRating value={r.rating} size="h-3 w-3" />}
        {r.publishedAt && <span suppressHydrationWarning>{new Date(r.publishedAt).toLocaleDateString()}</span>}
        {!!r.likeCount && <span className="flex items-center gap-1"><ThumbsUp className="h-3 w-3" />{r.likeCount}</span>}
        {r.reviewUrl && <a href={r.reviewUrl} target="_blank" rel="noreferrer" className="hover:text-foreground"><ExternalLink className="h-3 w-3" /></a>}
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
    </div>
  );
}

export function PlaceDetail({ placeId, onClose }: { placeId: string; onClose: () => void }) {
  const place = trpc.googleMaps.place.useQuery({ placeId }, { staleTime: 5 * 60_000 });
  const [sortBy, setSortBy] = useState<"relevance" | "newest">("relevance");
  // The place call already returns the top few reviews; only page through the reviews endpoint on demand.
  const [moreReviews, setMoreReviews] = useState(false);
  const reviews = trpc.googleMaps.reviews.useInfiniteQuery(
    { placeId, sortBy },
    { enabled: moreReviews, getNextPageParam: (last) => ((last.output as { nextPageToken?: string | null }).nextPageToken ?? undefined) },
  );

  const p = place.data?.output.place as PlaceDetailT | undefined;
  const paged = useMemo(() => reviews.data?.pages.flatMap((pg) => (pg.output as { reviews: Review[] }).reviews) ?? [], [reviews.data]);
  const shown = (moreReviews ? paged : ((place.data?.output.place as { reviews?: Review[] } | undefined)?.reviews ?? [])) as Review[];
  const counts = useMemo(() => Object.fromEntries((p?.ratingBreakdown ?? []).map((b) => [b.stars, b.count])), [p]);
  const today = DAYS[new Date().getDay()];

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {place.isLoading ? <div className="h-6 w-48 animate-pulse rounded bg-muted" /> : <h2 className="text-xl font-semibold">{p?.name}</h2>}
          {p && (
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {p.rating != null && <><StarRating value={p.rating} /><span className="tabular-nums">{p.rating.toFixed(1)}</span></>}
              {p.reviewCount != null && <span>({p.reviewCount.toLocaleString()})</span>}
              {p.categories.length > 0 && <span>· {p.categories.slice(0, 3).join(", ")}</span>}
            </div>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close"><X className="h-4 w-4" /></Button>
      </div>

      {place.isError && <ErrorDisplay message={place.error.message} onRetry={() => place.refetch()} />}
      {p?.description && <p className="text-sm leading-relaxed text-muted-foreground">{p.description}</p>}

      {p && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardContent className="space-y-2 pt-4 text-sm">
              {p.thumbnailUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.thumbnailUrl} alt="" className="mb-2 h-32 w-full rounded-md object-cover" />
              )}
              {p.address && <p className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />{p.address}</p>}
              {p.phoneNumber && <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" />{p.phoneNumber}<CopyButton value={p.phoneNumber} /></p>}
              <div className="flex flex-wrap gap-2 pt-1">
                {p.websiteUrl && <a href={p.websiteUrl} target="_blank" rel="noreferrer"><Button size="sm" variant="outline"><Globe className="mr-1.5 h-3.5 w-3.5" />Website</Button></a>}
                <a href={p.url} target="_blank" rel="noreferrer"><Button size="sm" variant="outline"><ExternalLink className="mr-1.5 h-3.5 w-3.5" />Google Maps</Button></a>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-4 pt-4">
              {p.ratingBreakdown.length > 0 && <RatingHistogram counts={counts} />}
              {p.openingHours.length > 0 && (
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
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {p && p.attributes.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Highlights</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {p.attributes.map((a) => (
              <div key={a.category}>
                <p className="mb-1 text-xs font-medium text-muted-foreground">{a.category}</p>
                <div className="flex flex-wrap gap-1">{a.values.map((v) => <Badge key={v} variant="secondary" className="font-normal">{v}</Badge>)}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {p && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold">Reviews</h3>
            {moreReviews && (
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} className="h-8 rounded-md border bg-background px-2 text-xs">
                <option value="relevance">Most relevant</option><option value="newest">Newest</option>
              </select>
            )}
          </div>
          {moreReviews && reviews.isLoading && <LoadingSkeleton rows={3} />}
          {reviews.isError && <ErrorDisplay message={reviews.error.message} onRetry={() => reviews.refetch()} />}
          {shown.map((r, i) => <ReviewItem key={i} r={r} />)}
          {!moreReviews && (
            <Button variant="outline" size="sm" onClick={() => setMoreReviews(true)}>All reviews (2 credits/page)</Button>
          )}
          {moreReviews && reviews.hasNextPage && (
            <Button variant="outline" size="sm" onClick={() => reviews.fetchNextPage()} disabled={reviews.isFetchingNextPage}>
              {reviews.isFetchingNextPage && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}More reviews
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

const openNow = (hours: Hours[]) => {
  const h = hours.find((x) => x.dayOfWeek === DAYS[new Date().getDay()]);
  return h?.hours;
};

/** Sync search: one page of up to 20 places per call, each clickable for details + reviews. */
export function QuickSearch() {
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [results, setResults] = useState<Place[]>([]);
  const [nextToken, setNextToken] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const search = trpc.googleMaps.search.useMutation();

  const run = async (append: boolean) => {
    const res = await search.mutateAsync({ query: query.trim(), location: location.trim() || undefined, nextPageToken: append ? nextToken : null });
    const out = res.output as { places: Place[]; nextPageToken?: string | null };
    setResults((prev) => (append ? [...prev, ...out.places] : out.places));
    setNextToken(out.nextPageToken ?? null);
    if (!append) setSelected(null);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b p-4">
        <form className="flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); if (query.trim()) run(false).catch(() => {}); }}>
          <div className="flex flex-col gap-1.5"><Label className="text-xs font-medium">What</Label><Input placeholder="dentists, ramen, coworking" value={query} onChange={(e) => setQuery(e.target.value)} className="w-64" /></div>
          <div className="flex flex-col gap-1.5"><Label className="text-xs font-medium">Where (optional)</Label><Input placeholder="Austin, TX" value={location} onChange={(e) => setLocation(e.target.value)} className="w-56" /></div>
          <Button type="submit" disabled={search.isPending || !query.trim()}>
            {search.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}Search
          </Button>
          <p className="pb-2 text-xs text-muted-foreground">Up to 20 places per page, instantly. Use Bulk extract for whole regions.</p>
        </form>
      </div>
      <div className="flex min-h-0 flex-1">
        <div className={cn("overflow-y-auto p-4", selected ? "hidden w-[26rem] shrink-0 border-r lg:block" : "flex-1")}>
          {search.isError && <ErrorDisplay message={search.error.message} />}
          {!search.isPending && results.length === 0 && !search.isError && (
            <EmptyState icon={MapPin} title={search.isSuccess ? "No places found" : "Quick search"} description={search.isSuccess ? "Try a different query or location." : "Look up places instantly, then open one for hours, highlights and reviews."} />
          )}
          <div className={cn("grid gap-3", !selected && "sm:grid-cols-2 xl:grid-cols-3")}>
            {results.map((r) => {
              const hrs = openNow(r.openingHours);
              return (
                <button key={r.placeId} type="button" className="text-left" onClick={() => setSelected(r.placeId)}>
                  <Card className={cn("h-full transition-colors hover:border-primary/50", selected === r.placeId && "border-primary")}>
                    <CardContent className="flex gap-3 p-3">
                      {r.thumbnailUrl
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={r.thumbnailUrl} alt="" className="h-16 w-16 shrink-0 rounded-md object-cover" loading="lazy" />
                        : <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md bg-muted"><MapPin className="h-5 w-5 text-muted-foreground" /></div>}
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <p className="flex items-center justify-between gap-1 font-medium leading-tight"><span className="truncate">{r.name}</span><ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" /></p>
                        {r.rating != null && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><StarRating value={r.rating} size="h-3 w-3" /><span className="tabular-nums">{r.rating.toFixed(1)} ({r.reviewCount?.toLocaleString() ?? 0})</span></div>
                        )}
                        <p className="truncate text-xs text-muted-foreground">{r.categories[0]}{r.address && ` · ${r.address}`}</p>
                        {hrs && <p className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3 w-3" />Today {hrs}</p>}
                      </div>
                    </CardContent>
                  </Card>
                </button>
              );
            })}
          </div>
          {nextToken && results.length > 0 && (
            <div className="mt-4 flex justify-center">
              <Button variant="outline" onClick={() => run(true).catch(() => {})} disabled={search.isPending}>
                {search.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Next 20
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
