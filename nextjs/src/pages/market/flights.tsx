import { useState } from "react";
import {
  Plane, Search, Loader2, ChevronDown, ChevronUp, Leaf, Moon, AlertTriangle, ExternalLink, Phone, Luggage, Sparkles, TrendingDown, Ticket,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorDisplay } from "@/components/shared/error-display";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { ToggleButtonGroup } from "@/components/shared/toggle-button-group";
import { cn } from "@/lib/utils";

type TravelClass = "economy" | "premiumEconomy" | "business" | "first";
interface Airport { iataCode?: string | null; name?: string | null; localDateTime?: string | null }
interface Segment {
  departureAirport: Airport; arrivalAirport: Airport; durationMinutes?: number | null; airlineName?: string | null; airlineLogoUrl?: string | null;
  travelClass?: string | null; flightNumber?: string | null; aircraftModel?: string | null; legroom?: string | null; isOvernight?: boolean | null; isOftenDelayed?: boolean | null;
}
interface Layover { iataCode?: string | null; airportName?: string | null; durationMinutes?: number | null; isOvernight?: boolean | null }
interface Flight {
  segments: Segment[]; layovers: Layover[]; totalDurationMinutes?: number | null; price?: number | null; bookingToken?: string | null;
  carbonEmissions?: { thisFlightKg?: number | null; typicalForRouteKg?: number | null; differencePercent?: number | null } | null;
  alsoSoldBy?: string[] | null; operatingCarrier?: string | null; mainAirlineLogoUrl?: string | null;
}
interface PriceInsights { lowestPrice?: number | null; priceLevel?: "low" | "typical" | "high" | null; typicalPriceRange?: { lowerBound?: number | null; upperBound?: number | null } | null; history: { snapshotDate?: string | null; price: number }[] }
interface Deal {
  destination: { name: string; countryCode?: string | null; iataCode?: string | null; tagline?: string | null; thumbnailUrl?: string | null };
  departureIataCode?: string | null; outboundDate?: string | null; returnDate?: string | null; tripLengthDays?: number | null; price: number; typicalPrice?: number | null;
  savingsAmount?: number | null; savingsPercentage?: number | null; stopCount?: number | null; durationMinutes?: number | null; airlineName?: string | null; bookingUrl?: string | null;
}
interface TripQuery { departureAirports: string; arrivalAirports: string; departureDate: string; returnDate?: string }

const fmtDuration = (min?: number | null) => {
  if (min == null) return "";
  const h = Math.floor(min / 60), m = min % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};
const fmtTime = (t?: string | null) => {
  if (!t) return "";
  try { return new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); } catch { return t; }
};
const fmtDay = (t?: string | null) => {
  if (!t) return "";
  try { return new Date(t).toLocaleDateString([], { month: "short", day: "numeric" }); } catch { return t; }
};
const money = (n: number | null | undefined, cur = "USD") =>
  n == null ? "—" : new Intl.NumberFormat(undefined, { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(n);
const plusDays = (d: number) => new Date(Date.now() + d * 86400e3).toISOString().slice(0, 10);

/** Price level gauge + history sparkline. */
function Insights({ data, cur }: { data: PriceInsights; cur: string }) {
  const lo = data.typicalPriceRange?.lowerBound, hi = data.typicalPriceRange?.upperBound, now = data.lowestPrice;
  const hist = data.history.filter((h) => typeof h.price === "number");
  const W = 320, H = 64;
  const min = Math.min(...hist.map((h) => h.price)), max = Math.max(...hist.map((h) => h.price));
  const path = hist.map((h, i) => `${i === 0 ? "M" : "L"}${(i / Math.max(1, hist.length - 1)) * W},${H - 4 - ((h.price - min) / Math.max(1, max - min)) * (H - 8)}`).join(" ");
  const tone = data.priceLevel === "low" ? "text-emerald-600 dark:text-emerald-400" : data.priceLevel === "high" ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400";
  return (
    <Card>
      <CardContent className="grid gap-4 pt-5 md:grid-cols-2">
        <div className="space-y-2">
          <p className="text-sm">
            Prices are <span className={cn("font-semibold", tone)}>{data.priceLevel ?? "—"}</span> right now
            {now != null && <> — cheapest <span className="font-semibold">{money(now, cur)}</span></>}
          </p>
          {lo != null && hi != null && now != null && (
            <div>
              <div className="relative h-2 rounded-full bg-gradient-to-r from-emerald-400 via-amber-300 to-red-400">
                <span className="absolute -top-1 h-4 w-1 rounded bg-foreground" style={{ left: `${Math.min(100, Math.max(0, ((now - lo) / Math.max(1, hi - lo)) * 100))}%` }} />
              </div>
              <div className="mt-1 flex justify-between text-[11px] text-muted-foreground"><span>{money(lo, cur)}</span><span>typical range</span><span>{money(hi, cur)}</span></div>
            </div>
          )}
        </div>
        {hist.length > 2 && (
          <div>
            <p className="mb-1 text-xs text-muted-foreground">Lowest price over the last {hist.length} days</p>
            <svg viewBox={`0 0 ${W} ${H}`} className="h-16 w-full" preserveAspectRatio="none">
              <path d={`${path} L${W},${H} L0,${H} Z`} className="fill-sky-500/10" />
              <path d={path} className="fill-none stroke-sky-500" strokeWidth={2} vectorEffect="non-scaling-stroke" />
            </svg>
            <div className="flex justify-between text-[11px] text-muted-foreground"><span>{fmtDay(hist[0].snapshotDate)}</span><span>{money(min, cur)}–{money(max, cur)}</span><span>{fmtDay(hist[hist.length - 1].snapshotDate)}</span></div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function BookingOptions({ token, trip, cur }: { token: string; trip: TripQuery; cur: string }) {
  const q = trpc.flights.bookingOptions.useQuery({ bookingToken: token, ...trip }, { staleTime: 5 * 60_000 });
  if (q.isLoading) return <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" />Fetching booking options…</div>;
  if (q.isError) return <p className="py-2 text-xs text-destructive">{q.error.message}</p>;
  const out = q.data?.output as { bookingOptions: Record<string, unknown>[]; currencyCode?: string | null };
  const opts = [...out.bookingOptions].sort((a, b) => ((a.price as number) ?? Infinity) - ((b.price as number) ?? Infinity));
  const c = out.currencyCode ?? cur;
  if (opts.length === 0) return <p className="py-2 text-xs text-muted-foreground">No booking options returned.</p>;
  return (
    <div className="space-y-2">
      {opts.map((o, i) => {
        const link = o.bookingLink as { url: string } | null;
        const conditions = (o.fareConditions ?? []) as string[];
        const bags = (o.baggageDetails ?? []) as string[];
        return (
          <div key={i} className={cn("rounded-md border p-2.5", i === 0 && "border-emerald-500/60 bg-emerald-500/5")}>
            <div className="flex items-center gap-2">
              <span className="flex-1 text-sm font-medium">{o.providerName as string}</span>
              {typeof o.fareType === "string" && <Badge variant="outline" className="text-[10px]">{o.fareType}</Badge>}
              {o.isSplitBooking === true && <Badge variant="outline" className="text-[10px]">Split ticket</Badge>}
              <span className="font-semibold tabular-nums">{money(o.price as number | null, c)}</span>
              {link?.url && <a href={link.url} target="_blank" rel="noreferrer"><Button size="sm" variant="outline" className="h-7"><ExternalLink className="mr-1 h-3 w-3" />Book</Button></a>}
            </div>
            {(conditions.length > 0 || bags.length > 0 || typeof o.bookingPhone === "string") && (
              <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                {conditions.map((c2) => <span key={c2}>{c2}</span>)}
                {bags.map((b) => <span key={b} className="flex items-center gap-1"><Luggage className="h-3 w-3" />{b}</span>)}
                {typeof o.bookingPhone === "string" && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{o.bookingPhone}</span>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function FlightCard({ f, cur, trip, best }: { f: Flight; cur: string; trip: TripQuery; best?: boolean }) {
  const [open, setOpen] = useState(false);
  const [showBooking, setShowBooking] = useState(false);
  const first = f.segments[0], last = f.segments[f.segments.length - 1];
  const stops = Math.max(0, f.segments.length - 1);
  const airlines = Array.from(new Set(f.segments.map((s) => s.airlineName).filter(Boolean)));
  const co2 = f.carbonEmissions?.differencePercent;
  return (
    <Card className={cn(best && "border-primary/40")}>
      <CardContent className="p-0">
        <button type="button" className="flex w-full items-center gap-4 p-4 text-left" onClick={() => setOpen(!open)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {(f.mainAirlineLogoUrl ?? first?.airlineLogoUrl) ? <img src={(f.mainAirlineLogoUrl ?? first?.airlineLogoUrl) as string} alt="" className="h-8 w-8 rounded object-contain" /> : <Plane className="h-8 w-8 text-muted-foreground" />}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium tabular-nums" suppressHydrationWarning>{fmtTime(first?.departureAirport.localDateTime)} – {fmtTime(last?.arrivalAirport.localDateTime)}</p>
            <p className="truncate text-xs text-muted-foreground">{airlines.join(", ")}{f.operatingCarrier && ` · Operated by ${f.operatingCarrier}`}</p>
          </div>
          <div className="hidden w-24 text-xs sm:block">
            <p className="font-medium">{fmtDuration(f.totalDurationMinutes)}</p>
            <p className="text-muted-foreground">{first?.departureAirport.iataCode}–{last?.arrivalAirport.iataCode}</p>
          </div>
          <div className="hidden w-28 text-xs sm:block">
            <p className="font-medium">{stops === 0 ? "Nonstop" : `${stops} stop${stops > 1 ? "s" : ""}`}</p>
            <p className="truncate text-muted-foreground">{f.layovers.map((l) => `${fmtDuration(l.durationMinutes)} ${l.iataCode ?? ""}`).join(", ")}</p>
          </div>
          {co2 != null && (
            <span className={cn("hidden items-center gap-1 text-xs md:flex", co2 < 0 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>
              <Leaf className="h-3 w-3" />{co2 > 0 ? "+" : ""}{co2}%
            </span>
          )}
          <span className="w-20 text-right font-semibold tabular-nums">{money(f.price, cur)}</span>
          {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>
        {open && (
          <div className="space-y-4 border-t px-4 py-4">
            <ol className="relative space-y-3 border-l pl-5">
              {f.segments.map((s, i) => (
                <li key={i} className="space-y-3">
                  <div className="relative">
                    <span className="absolute -left-[25px] top-1 h-2.5 w-2.5 rounded-full border-2 border-background bg-primary" />
                    <p className="text-sm"><span className="font-medium tabular-nums" suppressHydrationWarning>{fmtTime(s.departureAirport.localDateTime)}</span> · {s.departureAirport.name} ({s.departureAirport.iataCode})</p>
                    <p className="py-1.5 text-xs text-muted-foreground">
                      {fmtDuration(s.durationMinutes)} · {s.airlineName} {s.flightNumber} · {s.travelClass}
                      {s.aircraftModel && ` · ${s.aircraftModel}`}{s.legroom && ` · ${s.legroom} legroom`}
                      {s.isOvernight && <span className="ml-1 inline-flex items-center gap-0.5"><Moon className="h-3 w-3" />overnight</span>}
                      {s.isOftenDelayed && <span className="ml-1 inline-flex items-center gap-0.5 text-amber-600"><AlertTriangle className="h-3 w-3" />often delayed 30+ min</span>}
                    </p>
                    <p className="text-sm"><span className="font-medium tabular-nums" suppressHydrationWarning>{fmtTime(s.arrivalAirport.localDateTime)}</span> · {s.arrivalAirport.name} ({s.arrivalAirport.iataCode})</p>
                  </div>
                  {f.layovers[i] && (
                    <p className="rounded-md bg-muted/60 px-3 py-1.5 text-xs">
                      {fmtDuration(f.layovers[i].durationMinutes)} layover · {f.layovers[i].airportName} {f.layovers[i].isOvernight && "· overnight"}
                    </p>
                  )}
                </li>
              ))}
            </ol>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              {f.carbonEmissions?.thisFlightKg != null && <span className="flex items-center gap-1"><Leaf className="h-3 w-3" />{f.carbonEmissions.thisFlightKg} kg CO₂ (typical {f.carbonEmissions.typicalForRouteKg} kg)</span>}
              {f.alsoSoldBy?.length ? <span>Also sold by {f.alsoSoldBy.join(", ")}</span> : null}
            </div>
            {f.bookingToken && (
              showBooking
                ? <BookingOptions token={f.bookingToken} trip={trip} cur={cur} />
                : <Button size="sm" variant="outline" onClick={() => setShowBooking(true)}><Ticket className="mr-1.5 h-3.5 w-3.5" />See booking options</Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SearchTab() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [departureDate, setDepartureDate] = useState(plusDays(21));
  const [returnDate, setReturnDate] = useState("");
  const [travelClass, setTravelClass] = useState<TravelClass>("economy");
  const [maxStops, setMaxStops] = useState("");
  const [sortBy, setSortBy] = useState<"top" | "price" | "duration" | "departureTime" | "emissions">("top");
  const [trip, setTrip] = useState<TripQuery | null>(null);

  const search = trpc.flights.search.useMutation();

  const handleSearch = () => {
    if (!from.trim() || !to.trim() || !departureDate.trim()) return;
    const t: TripQuery = { departureAirports: from.trim().toUpperCase(), arrivalAirports: to.trim().toUpperCase(), departureDate, returnDate: returnDate || undefined };
    setTrip(t);
    search.mutate({ ...t, travelClass, sortBy, maxStops: maxStops === "" ? undefined : Number(maxStops) });
  };

  const out = search.data?.output as { bestFlights?: Flight[]; otherFlights?: Flight[]; currencyCode?: string | null; priceInsights?: PriceInsights | null } | undefined;
  const best = out?.bestFlights ?? [];
  const other = out?.otherFlights ?? [];
  const cur = out?.currencyCode ?? "USD";

  return (
    <>
      <div className="border-b p-4">
        <form className="flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); handleSearch(); }}>
          <div className="flex flex-col gap-1.5"><Label className="text-xs font-medium">From</Label><Input placeholder="SFO" value={from} onChange={(e) => setFrom(e.target.value)} className="w-24" /></div>
          <div className="flex flex-col gap-1.5"><Label className="text-xs font-medium">To</Label><Input placeholder="JFK" value={to} onChange={(e) => setTo(e.target.value)} className="w-24" /></div>
          <div className="flex flex-col gap-1.5"><Label className="text-xs font-medium">Depart</Label><Input type="date" value={departureDate} onChange={(e) => setDepartureDate(e.target.value)} className="w-36" /></div>
          <div className="flex flex-col gap-1.5"><Label className="text-xs font-medium">Return</Label><Input type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} className="w-36" /></div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium">Class</Label>
            <select value={travelClass} onChange={(e) => setTravelClass(e.target.value as TravelClass)} className="h-10 rounded-md border bg-background px-2 text-sm">
              <option value="economy">Economy</option><option value="premiumEconomy">Premium Economy</option><option value="business">Business</option><option value="first">First</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium">Stops</Label>
            <select value={maxStops} onChange={(e) => setMaxStops(e.target.value)} className="h-10 rounded-md border bg-background px-2 text-sm">
              <option value="">Any</option><option value="0">Nonstop</option><option value="1">1 stop or fewer</option><option value="2">2 stops or fewer</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium">Sort</Label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} className="h-10 rounded-md border bg-background px-2 text-sm">
              <option value="top">Top flights</option><option value="price">Price</option><option value="duration">Duration</option><option value="departureTime">Departure time</option><option value="emissions">Emissions</option>
            </select>
          </div>
          <Button type="submit" disabled={search.isPending}>
            {search.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}Search
          </Button>
        </form>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-4xl space-y-4">
          {search.isError && <ErrorDisplay message={search.error.message} />}
          {search.isPending && <LoadingSkeleton rows={4} />}
          {search.isSuccess && best.length + other.length === 0 && <EmptyState icon={Plane} title="No flights found" description="Try different airports or dates (use IATA codes like SFO, JFK)." />}
          {out?.priceInsights && <Insights data={out.priceInsights} cur={cur} />}
          {trip && best.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-sm font-semibold">Best flights</h2>
              {best.map((f, i) => <FlightCard key={`b${i}`} f={f} cur={cur} trip={trip} best />)}
            </section>
          )}
          {trip && other.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-sm font-semibold">Other flights</h2>
              {other.map((f, i) => <FlightCard key={`o${i}`} f={f} cur={cur} trip={trip} />)}
            </section>
          )}
          {!search.data && !search.isPending && !search.isError && (
            <EmptyState icon={Plane} title="Flight search" description="Enter origin/destination IATA codes and a departure date. Open a result to see the full itinerary and where to book it." />
          )}
        </div>
      </div>
    </>
  );
}

function DealsTab() {
  const [from, setFrom] = useState("");
  const [mode, setMode] = useState<"freeText" | "filters">("freeText");
  const [freeText, setFreeText] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [maxStops, setMaxStops] = useState("");
  const [travelClass, setTravelClass] = useState<TravelClass>("economy");
  const deals = trpc.flights.deals.useMutation();

  const run = () => {
    if (from.trim().length < 2) return;
    deals.mutate(mode === "freeText" && freeText.trim()
      ? { departureAirports: from.trim().toUpperCase(), freeText: freeText.trim() }
      : { departureAirports: from.trim().toUpperCase(), maxPrice: maxPrice ? Number(maxPrice) : undefined, maxStops: maxStops === "" ? undefined : Number(maxStops), travelClass });
  };

  const out = deals.data?.output as { deals: Deal[]; currencyCode: string } | undefined;
  const list = [...(out?.deals ?? [])].sort((a, b) => (b.savingsPercentage ?? 0) - (a.savingsPercentage ?? 0));
  const cur = out?.currencyCode ?? "USD";

  return (
    <>
      <div className="space-y-3 border-b p-4">
        <ToggleButtonGroup<"freeText" | "filters"> value={mode} onChange={setMode} options={[{ value: "freeText", label: "Describe a trip" }, { value: "filters", label: "Filters" }]} />
        <form className="flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); run(); }}>
          <div className="flex flex-col gap-1.5"><Label className="text-xs font-medium">From</Label><Input placeholder="SFO" value={from} onChange={(e) => setFrom(e.target.value)} className="w-24" /></div>
          {mode === "freeText" ? (
            <div className="flex flex-col gap-1.5"><Label className="text-xs font-medium">What kind of trip?</Label><Input placeholder="Beach weekend in December under $400" value={freeText} onChange={(e) => setFreeText(e.target.value)} className="w-96" /></div>
          ) : (
            <>
              <div className="flex flex-col gap-1.5"><Label className="text-xs font-medium">Max price</Label><Input type="number" min={0} placeholder="Any" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} className="w-28" /></div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium">Stops</Label>
                <select value={maxStops} onChange={(e) => setMaxStops(e.target.value)} className="h-10 rounded-md border bg-background px-2 text-sm">
                  <option value="">Any</option><option value="0">Nonstop</option><option value="1">1 stop or fewer</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium">Class</Label>
                <select value={travelClass} onChange={(e) => setTravelClass(e.target.value as TravelClass)} className="h-10 rounded-md border bg-background px-2 text-sm">
                  <option value="economy">Economy</option><option value="premiumEconomy">Premium Economy</option><option value="business">Business</option><option value="first">First</option>
                </select>
              </div>
            </>
          )}
          <Button type="submit" disabled={deals.isPending || from.trim().length < 2}>
            {deals.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}Find deals
          </Button>
        </form>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        {deals.isError && <ErrorDisplay message={deals.error.message} />}
        {deals.isPending && <LoadingSkeleton rows={4} />}
        {deals.isSuccess && list.length === 0 && <EmptyState icon={TrendingDown} title="No deals found" description="Try a broader description or a higher max price." />}
        {!deals.data && !deals.isPending && !deals.isError && (
          <EmptyState icon={TrendingDown} title="Flight deals" description="Find the cheapest places to fly from an airport — describe a trip in plain English or use filters." />
        )}
        <div className="mx-auto grid max-w-6xl gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((d, i) => {
            const pct = d.savingsPercentage ?? (d.typicalPrice ? Math.round(((d.typicalPrice - d.price) / d.typicalPrice) * 100) : null);
            return (
              <Card key={i} className="overflow-hidden">
                <div className="relative h-36 bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {d.destination.thumbnailUrl ? <img src={d.destination.thumbnailUrl} alt="" className="h-full w-full object-cover" loading="lazy" /> : <div className="flex h-full items-center justify-center"><Plane className="h-8 w-8 text-muted-foreground/50" /></div>}
                  {pct != null && pct > 0 && <Badge className="absolute left-2 top-2 bg-emerald-600 hover:bg-emerald-600"><TrendingDown className="mr-1 h-3 w-3" />{pct}% below typical</Badge>}
                </div>
                <CardHeader className="pb-1 pt-3">
                  <CardTitle className="flex items-baseline justify-between gap-2 text-base">
                    <span className="truncate">{d.destination.name}{d.destination.iataCode && <span className="ml-1 text-xs font-normal text-muted-foreground">{d.destination.iataCode}</span>}</span>
                    <span className="shrink-0 tabular-nums">{money(d.price, cur)}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1.5 text-xs text-muted-foreground">
                  {d.destination.tagline && <p className="line-clamp-2">{d.destination.tagline}</p>}
                  <p suppressHydrationWarning>
                    {fmtDay(d.outboundDate)}{d.returnDate && ` – ${fmtDay(d.returnDate)}`}{d.tripLengthDays && ` · ${d.tripLengthDays} days`}
                  </p>
                  <p>{[d.airlineName, d.stopCount === 0 ? "Nonstop" : d.stopCount != null ? `${d.stopCount} stop${d.stopCount > 1 ? "s" : ""}` : null, fmtDuration(d.durationMinutes)].filter(Boolean).join(" · ")}</p>
                  {d.typicalPrice != null && (
                    <div className="pt-1">
                      <div className="h-1.5 rounded-full bg-muted"><div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${Math.min(100, (d.price / d.typicalPrice) * 100)}%` }} /></div>
                      <p className="mt-0.5 text-[11px]">vs typical {money(d.typicalPrice, cur)}{d.savingsAmount ? ` · save ${money(d.savingsAmount, cur)}` : ""}</p>
                    </div>
                  )}
                  {d.bookingUrl && <a href={d.bookingUrl} target="_blank" rel="noreferrer" className="inline-block pt-1"><Button size="sm" variant="outline" className="h-7"><ExternalLink className="mr-1 h-3 w-3" />View</Button></a>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </>
  );
}

export default function FlightsPage() {
  const [tab, setTab] = useState<"search" | "deals">("search");
  return (
    <div className="flex h-full flex-col">
      <Header icon={Plane} title="Flights" description="Search itineraries, compare where to book, and discover deals">
        <ToggleButtonGroup<"search" | "deals"> value={tab} onChange={setTab} options={[{ value: "search", label: "Search", icon: Search }, { value: "deals", label: "Deals", icon: TrendingDown }]} />
      </Header>
      {tab === "search" ? <SearchTab /> : <DealsTab />}
    </div>
  );
}
