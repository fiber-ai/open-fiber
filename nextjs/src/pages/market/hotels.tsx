import { useMemo, useState } from "react";
import {
  BedDouble, Search, Loader2, MapPin, Phone, ExternalLink, Navigation, X, Check, Clock, Leaf, ShieldCheck, Footprints, Car, Bus, Star,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorDisplay } from "@/components/shared/error-display";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { ToggleButtonGroup } from "@/components/shared/toggle-button-group";
import { StarRating, RatingHistogram } from "@/components/shared/star-rating";
import { cn } from "@/lib/utils";

type Source = "google" | "booking";
type Money = { currencyCode: string; allInCost?: number | null; baseCost?: number | null } | null | undefined;
type Row = Record<string, unknown>;

/** Common shape for result cards + the scatter, so both sources render the same way. */
interface Stay {
  id: string;
  source: Source;
  name: string;
  image?: string | null;
  rating?: number | null; // Google: 0–5, Booking: 0–10
  reviewCount?: number | null;
  starClass?: number | null;
  nightly?: number | null;
  total?: number | null;
  wasNightly?: number | null;
  currency: string;
  place?: string | null;
  tags: string[];
}

const money = (n: number | null | undefined, cur: string) =>
  n == null ? "—" : new Intl.NumberFormat(undefined, { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(n);
const cost = (m: Money) => m?.allInCost ?? m?.baseCost ?? null;
const ratingOutOf5 = (s: Stay) => (s.rating == null ? null : s.source === "booking" ? s.rating / 2 : s.rating);

const plusDays = (d: number) => {
  const t = new Date(Date.now() + d * 86400e3);
  return t.toISOString().slice(0, 10);
};

function normalizeGoogle(p: Row, currency: string): Stay {
  const nightly = cost(p.ratePerNight as Money);
  return {
    id: p.propertyToken as string,
    source: "google",
    name: p.name as string,
    image: (p.images as { thumbnailUrl?: string | null }[] | undefined)?.[0]?.thumbnailUrl,
    rating: p.rating as number | null,
    reviewCount: p.reviewCount as number | null,
    starClass: p.hotelStarClass as number | null,
    nightly,
    total: cost(p.totalRate as Money),
    currency: (p.ratePerNight as Money)?.currencyCode ?? currency,
    place: [p.city, p.countryCode].filter(Boolean).join(", ") || null,
    tags: [p.deal as string | null, p.type === "vacationRental" ? "Vacation rental" : null].filter(Boolean) as string[],
  };
}

function normalizeBooking(p: Row, currency: string): Stay {
  const n = p.nightlyPrice as { amount: number; currencyCode: string } | null;
  const t = p.totalPrice as { amount: number; currencyCode: string } | null;
  const o = p.originalPrice as { amount: number; currencyCode: string } | null;
  return {
    id: p.propertyUrl as string,
    source: "booking",
    name: p.name as string,
    image: p.thumbnailUrl as string | null,
    rating: p.reviewScore as number | null,
    reviewCount: p.reviewCount as number | null,
    starClass: p.hotelStarClass as number | null,
    nightly: n?.amount ?? null,
    total: t?.amount ?? null,
    wasNightly: o && n && o.amount > n.amount ? o.amount : null,
    currency: n?.currencyCode ?? t?.currencyCode ?? currency,
    place: [p.district, p.city].filter(Boolean).join(", ") || null,
    tags: [
      p.hasFreeCancellation ? "Free cancellation" : null,
      p.mealPlan as string | null,
      p.isPreferred ? "Preferred" : null,
      p.isSoldOut ? "Sold out" : null,
    ].filter(Boolean) as string[],
  };
}

/** Price (x) vs rating (y) scatter — the "value" corner is bottom-right → top-left. */
function ValueScatter({ stays, selected, onSelect }: { stays: Stay[]; selected: string | null; onSelect: (id: string) => void }) {
  const pts = stays.filter((s) => s.nightly != null && ratingOutOf5(s) != null);
  if (pts.length < 3) return null;
  const W = 1000, H = 220, P = { l: 40, r: 16, t: 12, b: 28 };
  const xs = pts.map((s) => s.nightly as number);
  const ys = pts.map((s) => ratingOutOf5(s) as number);
  const xMin = Math.min(...xs), xMax = Math.max(...xs);
  const yMin = Math.max(0, Math.floor(Math.min(...ys) * 2) / 2 - 0.5), yMax = 5;
  const x = (v: number) => P.l + ((v - xMin) / Math.max(1, xMax - xMin)) * (W - P.l - P.r);
  const y = (v: number) => H - P.b - ((v - yMin) / Math.max(0.5, yMax - yMin)) * (H - P.t - P.b);
  const cur = pts[0].currency;
  const ticks = [xMin, (xMin + xMax) / 2, xMax];
  const yTicks = [yMin, (yMin + yMax) / 2, yMax];
  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle className="text-sm">Price vs rating</CardTitle>
        <p className="text-xs text-muted-foreground">Top-left is the best value. Click a dot to open it.</p>
      </CardHeader>
      <CardContent>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Nightly price versus rating">
          <rect x={P.l} y={P.t} width={(W - P.l - P.r) / 2} height={(H - P.t - P.b) / 2} className="fill-success/10" />
          {yTicks.map((t) => (
            <g key={t}>
              <line x1={P.l} x2={W - P.r} y1={y(t)} y2={y(t)} className="stroke-border" strokeDasharray="2 3" />
              <text x={P.l - 6} y={y(t) + 3} textAnchor="end" className="fill-muted-foreground text-[10px]">{t.toFixed(1)}</text>
            </g>
          ))}
          {ticks.map((t, i) => (
            <text key={i} x={x(t)} y={H - 8} textAnchor={i === 0 ? "start" : i === 2 ? "end" : "middle"} className="fill-muted-foreground text-[10px]">{money(t, cur)}</text>
          ))}
          {pts.map((s) => (
            <circle
              key={s.id}
              cx={x(s.nightly as number)}
              cy={y(ratingOutOf5(s) as number)}
              r={selected === s.id ? 7 : 5}
              className={cn("cursor-pointer stroke-background transition-all", selected === s.id ? "fill-primary" : "fill-info/70 hover:fill-info")}
              strokeWidth={1.5}
              onClick={() => onSelect(s.id)}
            >
              <title>{`${s.name} — ${money(s.nightly, s.currency)}/night, ${ratingOutOf5(s)?.toFixed(1)}★`}</title>
            </circle>
          ))}
        </svg>
      </CardContent>
    </Card>
  );
}

function Photos({ urls }: { urls: string[] }) {
  if (urls.length === 0) return null;
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {urls.slice(0, 12).map((src) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={src} src={src} alt="" className="h-32 w-48 shrink-0 rounded-md object-cover" loading="lazy" />
      ))}
    </div>
  );
}

const transportIcon = (t?: string | null) => (/walk/i.test(t ?? "") ? Footprints : /taxi|car|driv/i.test(t ?? "") ? Car : Bus);

function GoogleDetail({ token, stay }: { token: string; stay: { checkInDate: string; checkOutDate: string; adults: number; currencyCode: string } }) {
  const q = trpc.hotels.property.useQuery({ propertyToken: token, ...stay }, { staleTime: 5 * 60_000 });
  if (q.isLoading) return <LoadingSkeleton rows={4} />;
  if (q.isError) return <ErrorDisplay message={q.error.message} onRetry={() => q.refetch()} />;
  const p = (q.data?.output as { property: Row }).property;
  const offers = ((p.offers ?? []) as Row[])
    .map((o) => ({
      sourceName: o.sourceName as string | null, logoUrl: o.logoUrl as string | null, url: o.url as string | null, isOfficial: o.isOfficial as boolean | null,
      nightly: cost(o.ratePerNight as Money), cur: (o.ratePerNight as Money)?.currencyCode ?? stay.currencyCode,
    }))
    .sort((a, b) => (a.nightly ?? Infinity) - (b.nightly ?? Infinity));
  const cheapest = offers[0]?.nightly;
  const rb = p.ratingsBreakdown as Record<string, number | null> | null;
  const counts = rb ? { 1: rb.oneStarCount ?? 0, 2: rb.twoStarCount ?? 0, 3: rb.threeStarCount ?? 0, 4: rb.fourStarCount ?? 0, 5: rb.fiveStarCount ?? 0 } : null;
  const aspects = ((p.reviewsBreakdown ?? []) as Row[]).filter((a) => (a.totalCount as number) > 0);
  const range = p.typicalPriceRange as { lowerBound?: number; upperBound?: number; currencyCode: string } | null;
  const nightly = cost(p.ratePerNight as Money);
  const nearby = (p.nearbyPlaces ?? []) as { name?: string; transportations: { type?: string; durationMinutes?: number }[] }[];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold">{p.name as string}</h2>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          {p.hotelStarClass != null && <span>{p.hotelStarClass as number}-star hotel</span>}
          {p.rating != null && <><StarRating value={p.rating as number} /><span>{(p.rating as number).toFixed(1)} ({(p.reviewCount as number | null)?.toLocaleString()})</span></>}
          {p.locationRating != null && <span>· Location {(p.locationRating as number).toFixed(1)}/5</span>}
        </div>
      </div>
      <Photos urls={((p.images ?? []) as { originalUrl?: string; thumbnailUrl?: string }[]).map((i) => i.originalUrl ?? i.thumbnailUrl).filter(Boolean) as string[]} />
      {typeof p.description === "string" && <p className="text-sm leading-relaxed text-muted-foreground">{p.description}</p>}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Where to book</CardTitle></CardHeader>
          <CardContent className="space-y-1.5">
            {offers.length === 0 && <p className="text-sm text-muted-foreground">No live offers for these dates.</p>}
            {offers.slice(0, 8).map((o, i) => (
              <a key={i} href={o.url ?? undefined} target="_blank" rel="noreferrer" className={cn("flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm hover:bg-muted/50", o.nightly === cheapest && "border-success/60 bg-success/5")}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {o.logoUrl ? <img src={o.logoUrl} alt="" className="h-5 w-5 shrink-0 rounded object-contain" /> : <span className="h-5 w-5 shrink-0" />}
                <span className="min-w-0 flex-1 break-words leading-tight">{o.sourceName}</span>
                {o.isOfficial === true && <Badge variant="outline" className="shrink-0 text-[10px]">Official</Badge>}
                {o.nightly === cheapest && <Badge className="shrink-0 bg-success text-[10px] hover:bg-success">Lowest</Badge>}
                <span className="shrink-0 font-medium tabular-nums">{money(o.nightly, o.cur)}</span>
              </a>
            ))}
            {range?.lowerBound != null && range.upperBound != null && nightly != null && (
              <div className="pt-3">
                <p className="mb-1 text-xs text-muted-foreground">Typical nightly price for this hotel</p>
                <div className="relative h-2 rounded-full bg-gradient-to-r from-success via-warning/60 to-destructive">
                  <span
                    className="absolute -top-1 h-4 w-1 rounded bg-foreground"
                    style={{ left: `${Math.min(100, Math.max(0, ((nightly - range.lowerBound) / Math.max(1, range.upperBound - range.lowerBound)) * 100))}%` }}
                    title={`This stay: ${money(nightly, range.currencyCode)}`}
                  />
                </div>
                <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
                  <span>{money(range.lowerBound, range.currencyCode)}</span>
                  <span>this stay {money(nightly, range.currencyCode)}</span>
                  <span>{money(range.upperBound, range.currencyCode)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">What guests say</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {counts && <RatingHistogram counts={counts} />}
            {aspects.slice(0, 6).map((a, i) => {
              const tot = (a.totalCount as number) || 1;
              const pos = ((a.positiveCount as number) ?? 0) / tot, neu = ((a.neutralCount as number) ?? 0) / tot, neg = ((a.negativeCount as number) ?? 0) / tot;
              return (
                <div key={i} className="space-y-1" title={(a.description as string) ?? undefined}>
                  <div className="flex justify-between text-xs"><span className="font-medium">{a.name as string}</span><span className="text-muted-foreground">{Math.round(pos * 100)}% positive</span></div>
                  <div className="flex h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="bg-success" style={{ width: `${pos * 100}%` }} />
                    <div className="bg-warning/60" style={{ width: `${neu * 100}%` }} />
                    <div className="bg-destructive" style={{ width: `${neg * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="space-y-2 pt-4 text-sm">
            {typeof p.address === "string" && <p className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />{p.address}</p>}
            {typeof p.phone === "string" && <p className="flex gap-2"><Phone className="h-4 w-4 text-muted-foreground" />{p.phone}</p>}
            {(p.checkInTime || p.checkOutTime) ? <p className="flex gap-2"><Clock className="h-4 w-4 text-muted-foreground" />Check-in {(p.checkInTime as string) ?? "—"} · Check-out {(p.checkOutTime as string) ?? "—"}</p> : null}
            <div className="flex flex-wrap gap-2 pt-1">
              {typeof p.url === "string" && <a href={p.url} target="_blank" rel="noreferrer"><Button size="sm" variant="outline"><ExternalLink className="mr-1.5 h-3.5 w-3.5" />Website</Button></a>}
              {typeof p.directionsUrl === "string" && <a href={p.directionsUrl} target="_blank" rel="noreferrer"><Button size="sm" variant="outline"><Navigation className="mr-1.5 h-3.5 w-3.5" />Directions</Button></a>}
            </div>
            {nearby.length > 0 && (
              <div className="space-y-1 pt-2">
                <p className="text-xs font-medium text-muted-foreground">Nearby</p>
                {nearby.slice(0, 6).map((n, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 text-xs">
                    <span className="truncate">{n.name}</span>
                    <span className="flex shrink-0 gap-2 text-muted-foreground">
                      {n.transportations.slice(0, 2).map((t, j) => { const I = transportIcon(t.type); return <span key={j} className="flex items-center gap-0.5"><I className="h-3 w-3" />{t.durationMinutes}m</span>; })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-1">
              {((p.amenitiesDetailed as string[] | undefined)?.length ? p.amenitiesDetailed as string[] : (p.amenities as string[] ?? [])).map((a) => (
                <Badge key={a} variant="secondary" className="font-normal"><Check className="mr-1 h-3 w-3" />{a}</Badge>
              ))}
              {((p.excludedAmenities ?? []) as string[]).map((a) => (
                <Badge key={a} variant="outline" className="font-normal text-muted-foreground line-through">{a}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

const SCORE_LABELS: Record<string, string> = { staff: "Staff", facilities: "Facilities", cleanliness: "Cleanliness", comfort: "Comfort", value: "Value for money", location: "Location", breakfast: "Breakfast", wifi: "Free WiFi" };

function BookingDetail({ url }: { url: string }) {
  const q = trpc.hotels.bookingProperty.useQuery({ propertyUrl: url }, { staleTime: 5 * 60_000 });
  if (q.isLoading) return <LoadingSkeleton rows={4} />;
  if (q.isError) return <ErrorDisplay message={q.error.message} onRetry={() => q.refetch()} />;
  const p = (q.data?.output as { property: Row }).property;
  const scores = Object.entries((p.scoreBreakdown ?? {}) as Record<string, number | null>).filter(([, v]) => v != null) as [string, number][];
  const rules = (p.houseRules ?? null) as Record<string, unknown> | null;
  const ruleRows = rules ? ([
    ["Age", rules.ageRestriction], ["Children", rules.childrenPolicy], ["Pets", rules.petsPolicy], ["Smoking", rules.smokingPolicy], ["Parties", rules.partiesPolicy], ["Groups", rules.groupPolicy],
  ].filter(([, v]) => typeof v === "string") as [string, string][]) : [];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          {p.name as string}
          {p.isSustainable === true && <span title="Sustainability certified"><Leaf className="h-4 w-4 text-success" /></span>}
        </h2>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          {typeof p.accommodationType === "string" && <span>{p.accommodationType}</span>}
          {p.hotelStarClass != null && <span className="flex items-center">{Array.from({ length: p.hotelStarClass as number }).map((_, i) => <Star key={i} className="h-3 w-3 fill-rating text-rating" />)}</span>}
          {p.reviewScore != null && <Badge className="bg-info hover:bg-info">{(p.reviewScore as number).toFixed(1)}</Badge>}
          {p.reviewCount != null && <span>{(p.reviewCount as number).toLocaleString()} reviews</span>}
        </div>
      </div>
      <Photos urls={(p.photoUrls ?? []) as string[]} />
      {typeof p.description === "string" && <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{p.description}</p>}
      <div className="grid gap-4 md:grid-cols-2">
        {scores.length > 0 && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Guest scores</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {scores.sort((a, b) => b[1] - a[1]).map(([k, v]) => (
                <div key={k} className="space-y-1">
                  <div className="flex justify-between text-xs"><span>{SCORE_LABELS[k] ?? k}</span><span className="font-medium tabular-nums">{v.toFixed(1)}</span></div>
                  <div className="h-1.5 rounded-full bg-muted"><div className={cn("h-1.5 rounded-full", v >= 9 ? "bg-success" : v >= 8 ? "bg-info" : v >= 7 ? "bg-warning" : "bg-destructive")} style={{ width: `${v * 10}%` }} /></div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
        <Card>
          <CardContent className="space-y-2 pt-4 text-sm">
            {typeof p.address === "string" && <p className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />{p.address}</p>}
            {(p.checkInTime || p.checkOutTime) ? <p className="flex gap-2"><Clock className="h-4 w-4 text-muted-foreground" />Check-in {(p.checkInTime as string) ?? "—"} · Check-out {(p.checkOutTime as string) ?? "—"}</p> : null}
            {((p.languagesSpoken ?? []) as string[]).length > 0 && <p className="text-xs text-muted-foreground">Staff speak {(p.languagesSpoken as string[]).join(", ")}</p>}
            {ruleRows.length > 0 && (
              <table className="mt-2 w-full text-xs">
                <tbody>{ruleRows.map(([k, v]) => <tr key={k} className="border-t"><td className="py-1 pr-2 font-medium align-top">{k}</td><td className="py-1 text-muted-foreground">{v}</td></tr>)}</tbody>
              </table>
            )}
            {rules && Array.isArray(rules.paymentMethods) && (rules.paymentMethods as string[]).length > 0 && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><ShieldCheck className="h-3.5 w-3.5" />Pays with {(rules.paymentMethods as string[]).join(", ")}{rules.isCashAccepted ? ", cash" : ""}</p>
            )}
            <a href={p.propertyUrl as string} target="_blank" rel="noreferrer" className="inline-block pt-1"><Button size="sm" variant="outline"><ExternalLink className="mr-1.5 h-3.5 w-3.5" />Booking.com</Button></a>
          </CardContent>
        </Card>
      </div>
      {((p.amenities ?? []) as string[]).length > 0 && (
        <div className="flex flex-wrap gap-1">{(p.amenities as string[]).map((a) => <Badge key={a} variant="secondary" className="font-normal"><Check className="mr-1 h-3 w-3" />{a}</Badge>)}</div>
      )}
    </div>
  );
}

export default function HotelsPage() {
  const [source, setSource] = useState<Source>("google");
  const [query, setQuery] = useState("");
  const [checkIn, setCheckIn] = useState(plusDays(14));
  const [checkOut, setCheckOut] = useState(plusDays(17));
  const [adults, setAdults] = useState(2);
  const [sortBy, setSortBy] = useState<"relevance" | "lowestPrice" | "highestRating" | "mostReviewed">("relevance");
  const [stars, setStars] = useState<number[]>([]);
  const [rentals, setRentals] = useState(false);
  const [freeCancel, setFreeCancel] = useState(false);
  const [maxPrice, setMaxPrice] = useState("");

  const [results, setResults] = useState<Stay[]>([]);
  const [nextToken, setNextToken] = useState<string | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [searchedStay, setSearchedStay] = useState({ checkInDate: checkIn, checkOutDate: checkOut, adults, currencyCode: "USD" });

  const google = trpc.hotels.search.useMutation();
  const booking = trpc.hotels.bookingSearch.useMutation();
  const active = source === "google" ? google : booking;
  const nights = Math.max(0, Math.round((Date.parse(checkOut) - Date.parse(checkIn)) / 86400e3));

  const run = async (append: boolean) => {
    const base = { query: query.trim(), checkInDate: checkIn, checkOutDate: checkOut, adults, currencyCode: "USD", sortBy, nextPageToken: append ? nextToken : null };
    const res = source === "google"
      ? await google.mutateAsync({
        ...base,
        propertyCategory: rentals ? "vacationRental" : "hotel",
        hotelStarClasses: rentals ? undefined : stars.filter((s) => s >= 2),
        freeCancellation: freeCancel,
        maxPerNight: maxPrice ? Number(maxPrice) : undefined,
      })
      : await booking.mutateAsync({ ...base, hotelStarClasses: stars });
    const out = res.output as { properties: Row[]; nextPageToken?: string | null; currencyCode?: string | null; searchInformation?: { totalResultCount?: number | null } | null };
    const cur = out.currencyCode ?? "USD";
    const mapped = out.properties.map((p) => (source === "google" ? normalizeGoogle(p, cur) : normalizeBooking(p, cur)));
    setResults((prev) => (append ? [...prev, ...mapped] : mapped));
    setNextToken(out.nextPageToken ?? null);
    setTotal(out.searchInformation?.totalResultCount ?? null);
    setSearchedStay({ checkInDate: checkIn, checkOutDate: checkOut, adults, currencyCode: "USD" });
    if (!append) setSelected(null);
  };

  const sel = useMemo(() => results.find((r) => r.id === selected) ?? null, [results, selected]);
  const canSearch = query.trim().length >= 2 && nights > 0;

  return (
    <div className="flex h-full flex-col">
      <Header icon={BedDouble} title="Hotels" description="Compare stays across Google Hotels and Booking.com" />

      <div className="space-y-3 border-b p-4">
        <ToggleButtonGroup<Source>
          value={source}
          onChange={(s) => { setSource(s); setResults([]); setSelected(null); setNextToken(null); }}
          options={[{ value: "google", label: "Google Hotels" }, { value: "booking", label: "Booking.com" }]}
        />
        <form className="flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); if (canSearch) run(false).catch(() => {}); }}>
          <div className="flex flex-col gap-1.5"><Label htmlFor="hotels-destination" className="text-xs font-medium">Destination</Label><Input id="hotels-destination" placeholder="Lisbon, Portugal" value={query} onChange={(e) => setQuery(e.target.value)} className="w-60" /></div>
          <div className="flex flex-col gap-1.5"><Label htmlFor="hotels-check-in" className="text-xs font-medium">Check-in</Label><Input id="hotels-check-in" type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className="w-40" /></div>
          <div className="flex flex-col gap-1.5"><Label htmlFor="hotels-check-out" className="text-xs font-medium">Check-out {nights > 0 && <span className="font-normal text-muted-foreground">· {nights} night{nights > 1 ? "s" : ""}</span>}</Label><Input id="hotels-check-out" type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className="w-40" /></div>
          <div className="flex flex-col gap-1.5"><Label htmlFor="hotels-adults" className="text-xs font-medium">Adults</Label><Input id="hotels-adults" type="number" min={1} max={12} value={adults} onChange={(e) => setAdults(Math.max(1, Number(e.target.value) || 1))} className="w-20" /></div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="hotels-sort" className="text-xs font-medium">Sort</Label>
            <select id="hotels-sort" value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} className="h-10 rounded-md border bg-card px-2 text-sm">
              <option value="relevance">Relevance</option>
              <option value="lowestPrice">Lowest price</option>
              <option value="highestRating">Highest rating</option>
              <option value="mostReviewed">Most reviewed</option>
            </select>
          </div>
          {source === "google" && (
            <div className="flex flex-col gap-1.5"><Label htmlFor="hotels-max-night" className="text-xs font-medium">Max / night</Label><Input id="hotels-max-night" type="number" min={0} placeholder="Any" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} className="w-24" /></div>
          )}
          <Button type="submit" disabled={active.isPending || !canSearch}>
            {active.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}Search
          </Button>
        </form>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          {!(source === "google" && rentals) && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Stars</span>
              {(source === "google" ? [2, 3, 4, 5] : [1, 2, 3, 4, 5]).map((s) => (
                <button key={s} type="button" onClick={() => setStars((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]))}
                  className={cn("rounded-md border px-2 py-0.5 text-xs", stars.includes(s) ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted")}>{s}★</button>
              ))}
            </div>
          )}
          {source === "google" && (
            <>
              <label className="flex cursor-pointer items-center gap-1.5 text-xs"><Checkbox checked={rentals} onCheckedChange={(v) => setRentals(v === true)} />Vacation rentals</label>
              {!rentals && <label className="flex cursor-pointer items-center gap-1.5 text-xs"><Checkbox checked={freeCancel} onCheckedChange={(v) => setFreeCancel(v === true)} />Free cancellation</label>}
            </>
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <div className={cn("space-y-4 overflow-y-auto p-4", selected ? "hidden w-[26rem] shrink-0 border-r lg:block" : "flex-1")}>
          {active.isError && <ErrorDisplay message={active.error.message} />}
          {!active.isPending && results.length === 0 && !active.isError && (
            <EmptyState icon={BedDouble} title={active.isSuccess ? "No stays found" : "Find a place to stay"} description={active.isSuccess ? "Try other dates or loosen the filters." : "Pick a destination and dates. Switch sources to compare Google Hotels with Booking.com."} />
          )}
          {results.length > 0 && !selected && <ValueScatter stays={results} selected={selected} onSelect={setSelected} />}
          {results.length > 0 && total != null && <p className="text-xs text-muted-foreground">Showing {results.length} of {total.toLocaleString()} properties</p>}
          <div className={cn("grid gap-3", !selected && "sm:grid-cols-2 xl:grid-cols-3")}>
            {results.map((s) => (
              <button key={s.id} type="button" onClick={() => setSelected(s.id)} className="text-left">
                <Card className={cn("h-full overflow-hidden transition-colors hover:border-primary/50", selected === s.id && "border-primary")}>
                  {s.image
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={s.image} alt="" className={cn("w-full object-cover", selected ? "h-24" : "h-36")} loading="lazy" />
                    : <div className={cn("flex w-full items-center justify-center bg-muted", selected ? "h-24" : "h-36")}><BedDouble className="h-8 w-8 text-muted-foreground" /></div>}
                  <CardContent className="space-y-1.5 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium leading-tight">{s.name}</p>
                      {s.rating != null && (
                        <Badge className={cn("shrink-0 tabular-nums", s.source === "booking" ? "bg-info hover:bg-info" : "")}>
                          {s.rating.toFixed(1)}{s.source === "google" && "★"}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {[s.starClass ? `${s.starClass}-star` : null, s.place, s.reviewCount ? `${s.reviewCount.toLocaleString()} reviews` : null].filter(Boolean).join(" · ")}
                    </p>
                    <div className="flex items-end justify-between gap-2">
                      <div className="flex flex-wrap gap-1">{s.tags.slice(0, 2).map((t) => <Badge key={t} variant="outline" className="text-[10px] font-normal">{t}</Badge>)}</div>
                      <div className="shrink-0 text-right">
                        {s.wasNightly != null && <p className="text-[11px] text-muted-foreground line-through">{money(s.wasNightly, s.currency)}</p>}
                        <p className="font-semibold tabular-nums">{money(s.nightly, s.currency)}<span className="text-xs font-normal text-muted-foreground">/night</span></p>
                        {s.total != null && <p className="text-[11px] text-muted-foreground">{money(s.total, s.currency)} total</p>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </button>
            ))}
          </div>
          {nextToken && results.length > 0 && (
            <div className="flex justify-center">
              <Button variant="outline" onClick={() => run(true).catch(() => {})} disabled={active.isPending}>
                {active.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Load more
              </Button>
            </div>
          )}
        </div>
        {sel && (
          <div className="relative min-w-0 flex-1 overflow-y-auto p-6">
            <Button variant="ghost" size="icon" className="absolute right-4 top-4" onClick={() => setSelected(null)} aria-label="Close"><X className="h-4 w-4" /></Button>
            {sel.source === "google" ? <GoogleDetail key={sel.id} token={sel.id} stay={searchedStay} /> : <BookingDetail key={sel.id} url={sel.id} />}
          </div>
        )}
      </div>
    </div>
  );
}
