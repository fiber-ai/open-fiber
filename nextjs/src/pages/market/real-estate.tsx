import { useState } from "react";
import { Home, Search, Loader2, ExternalLink, BedDouble, Bath } from "lucide-react";
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

const priceLabel = (p: unknown): string | null => {
  if (!p || typeof p !== "object") return typeof p === "number" ? `$${p.toLocaleString()}` : null;
  const o = p as Row;
  const usd = o.usd as Row | undefined;
  const local = o.local as Row | undefined;
  const pick = usd ?? local;
  if (pick && typeof pick.amount === "number") {
    const code = typeof pick.currencyCode === "string" ? pick.currencyCode : "USD";
    return `${code === "USD" ? "$" : ""}${(pick.amount as number).toLocaleString()}${code !== "USD" ? ` ${code}` : ""}`;
  }
  return null;
};

export default function RealEstatePage() {
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState("forSale");
  const [minBeds, setMinBeds] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const search = trpc.realEstate.search.useMutation();

  const handleSearch = () => {
    if (!location.trim()) return;
    search.mutate({
      location: { mode: "raw", value: location.trim() },
      listingStatus: status as "forSale" | "forRent" | "sold",
      minBeds: minBeds ? Number(minBeds) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
    });
  };

  const properties = (search.data?.output?.properties ?? []) as Row[];
  const total = typeof search.data?.output?.totalCount === "number" ? (search.data.output.totalCount as number) : null;

  return (
    <div className="flex h-full flex-col">
      <Header icon={Home} title="Real Estate" description="Search property listings for sale or rent" />

      <div className="border-b p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px] space-y-1.5"><Label className="text-xs font-medium">Location</Label><Input placeholder="e.g. Austin, TX or 78701" value={location} onChange={(e) => setLocation(e.target.value)} /></div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Status</Label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-md border bg-background px-2 py-1.5 text-sm h-9">
              <option value="forSale">For sale</option>
              <option value="forRent">For rent</option>
              <option value="sold">Sold</option>
            </select>
          </div>
          <div className="space-y-1.5"><Label className="text-xs font-medium">Min beds</Label><Input type="number" min={0} value={minBeds} onChange={(e) => setMinBeds(e.target.value)} className="w-24" /></div>
          <div className="space-y-1.5"><Label className="text-xs font-medium">Max price</Label><Input type="number" min={0} value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} className="w-32" /></div>
          <Button onClick={handleSearch} disabled={!location.trim() || search.isPending}>
            {search.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
            Search
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {search.isError && <ErrorDisplay message={search.error.message} />}
        {search.isSuccess && properties.length === 0 && (
          <EmptyState icon={Home} title="No listings found" description="Try a different location or relax the filters." />
        )}
        {properties.length > 0 && (
          <div className="mx-auto max-w-3xl space-y-3">
            {total != null && <p className="text-xs text-muted-foreground">{total.toLocaleString()} matching listings</p>}
            <div className="grid gap-3 sm:grid-cols-2">
              {properties.map((pr, i) => {
                const img = (pr.imageUrls as string[] | undefined)?.[0] ?? (pr.imgSrc as string | undefined);
                const price = priceLabel(pr.price);
                const url = pr.url as string | undefined;
                return (
                  <Card key={i} className="overflow-hidden">
                    {img && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={img} alt="" className="h-40 w-full object-cover" />
                    )}
                    <CardContent className="pt-3 space-y-1">
                      {price && <p className="text-base font-semibold">{price}</p>}
                      <p className="text-sm">{(pr.address as string) ?? (pr.streetAddress as string) ?? "Address unavailable"}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {(pr.bedrooms ?? pr.beds) != null && <span className="flex items-center gap-1"><BedDouble className="h-3 w-3" />{String(pr.bedrooms ?? pr.beds)}</span>}
                        {(pr.bathrooms ?? pr.baths) != null && <span className="flex items-center gap-1"><Bath className="h-3 w-3" />{String(pr.bathrooms ?? pr.baths)}</span>}
                        {(pr.homeType as string) && <span>{pr.homeType as string}</span>}
                      </div>
                      {url && (
                        <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                          View listing <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
        {!search.data && !search.isPending && !search.isError && (
          <EmptyState icon={Home} title="Real-estate search" description="Enter a location (city, state, or ZIP) to find listings." />
        )}
      </div>
    </div>
  );
}
