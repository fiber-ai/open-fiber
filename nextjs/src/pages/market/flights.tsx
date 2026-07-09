import { useState } from "react";
import { Plane, Search, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorDisplay } from "@/components/shared/error-display";

type Row = Record<string, unknown>;

const fmtDuration = (min?: number | null): string => {
  if (min == null) return "";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};
const airportLabel = (a: unknown): string => {
  if (!a || typeof a !== "object") return "";
  const o = a as Row;
  return (o.iataCode as string) ?? (o.code as string) ?? (o.id as string) ?? (o.name as string) ?? "";
};
const timeLabel = (a: unknown): string => {
  if (!a || typeof a !== "object") return "";
  const t = ((a as Row).localDateTime as string | undefined) ?? ((a as Row).time as string | undefined);
  if (!t) return "";
  try { return new Date(t).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); } catch { return t; }
};

export default function FlightsPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [travelClass, setTravelClass] = useState("economy");

  const search = trpc.flights.search.useMutation();

  const handleSearch = () => {
    if (!from.trim() || !to.trim() || !departureDate.trim()) return;
    search.mutate({
      departureAirports: from.trim().toUpperCase(),
      arrivalAirports: to.trim().toUpperCase(),
      departureDate: departureDate.trim(),
      returnDate: returnDate.trim() || undefined,
      travelClass: travelClass as "economy" | "premiumEconomy" | "business" | "first",
    });
  };

  const best = (search.data?.output?.bestFlights ?? []) as Row[];
  const other = (search.data?.output?.otherFlights ?? []) as Row[];
  const flights = [...best, ...other];

  return (
    <div className="flex h-full flex-col">
      <Header icon={Plane} title="Flights" description="Search flight itineraries and prices" />

      <div className="border-b p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1.5"><Label className="text-xs font-medium">From</Label><Input placeholder="SFO" value={from} onChange={(e) => setFrom(e.target.value)} className="w-24" /></div>
          <div className="space-y-1.5"><Label className="text-xs font-medium">To</Label><Input placeholder="JFK" value={to} onChange={(e) => setTo(e.target.value)} className="w-24" /></div>
          <div className="space-y-1.5"><Label className="text-xs font-medium">Depart</Label><Input type="date" value={departureDate} onChange={(e) => setDepartureDate(e.target.value)} className="w-40" /></div>
          <div className="space-y-1.5"><Label className="text-xs font-medium">Return (optional)</Label><Input type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} className="w-40" /></div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Class</Label>
            <select value={travelClass} onChange={(e) => setTravelClass(e.target.value)} className="rounded-md border bg-background px-2 py-1.5 text-sm h-10">
              <option value="economy">Economy</option>
              <option value="premiumEconomy">Premium Economy</option>
              <option value="business">Business</option>
              <option value="first">First</option>
            </select>
          </div>
          <Button onClick={handleSearch} disabled={search.isPending}>
            {search.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
            Search
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {search.isError && <ErrorDisplay message={search.error.message} />}
        {search.isSuccess && flights.length === 0 && (
          <EmptyState icon={Plane} title="No flights found" description="Try different airports or dates (use IATA codes like SFO, JFK)." />
        )}
        {flights.length > 0 && (
          <div className="mx-auto max-w-2xl space-y-3">
            {flights.map((f, i) => {
              const segments = (f.segments ?? []) as Row[];
              const first = segments[0];
              const last = segments[segments.length - 1];
              const stops = Math.max(0, segments.length - 1);
              const airline = first ? (first.airlineName as string) : undefined;
              const logo = first ? (first.airlineLogoUrl as string) : undefined;
              const price = typeof f.price === "number" ? (f.price as number) : null;
              return (
                <Card key={i}>
                  <CardContent className="pt-4 flex items-center gap-4">
                    {logo && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={logo} alt={airline ?? ""} className="h-8 w-8 rounded object-contain" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        {airportLabel(first?.departureAirport)} → {airportLabel(last?.arrivalAirport)}
                      </p>
                      <p className="text-xs text-muted-foreground" suppressHydrationWarning>
                        {timeLabel(first?.departureAirport)} — {timeLabel(last?.arrivalAirport)}
                      </p>
                      <div className="flex gap-2 text-xs text-muted-foreground">
                        {airline && <span>{airline}</span>}
                        {f.totalDurationMinutes != null && <span>· {fmtDuration(f.totalDurationMinutes as number)}</span>}
                        <span>· {stops === 0 ? "Nonstop" : `${stops} stop${stops > 1 ? "s" : ""}`}</span>
                      </div>
                    </div>
                    {price != null && <Badge variant="secondary" className="text-sm shrink-0">${price.toLocaleString()}</Badge>}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
        {!search.data && !search.isPending && !search.isError && (
          <EmptyState icon={Plane} title="Flight search" description="Enter origin/destination IATA codes and a departure date." />
        )}
      </div>
    </div>
  );
}
