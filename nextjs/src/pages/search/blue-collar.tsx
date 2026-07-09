import { useState } from "react";
import { HardHat, Search, Loader2, ExternalLink, MapPin } from "lucide-react";
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

export default function BlueCollarPage() {
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");

  const search = trpc.blueCollar.search.useMutation();

  const handleSearch = () => {
    if (!query.trim() && !location.trim()) return;
    search.mutate({ query: query.trim() || undefined, location: location.trim() || undefined });
  };

  const jobs = (search.data?.output?.jobs ?? []) as Row[];
  const total = typeof search.data?.output?.total === "number" ? (search.data.output.total as number) : null;

  const comp = (j: Row): string | null => {
    const c = j.compensation as Row | undefined;
    if (!c) return null;
    const min = typeof c.min === "number" ? c.min : undefined;
    const max = typeof c.max === "number" ? c.max : undefined;
    const period = typeof c.period === "string" ? c.period : "";
    if (min == null && max == null) return null;
    const range = min != null && max != null ? `$${min.toLocaleString()}–$${max.toLocaleString()}` : `$${(min ?? max)!.toLocaleString()}`;
    return period ? `${range} / ${period}` : range;
  };

  return (
    <div className="flex h-full flex-col">
      <Header icon={HardHat} title="Blue-Collar Jobs" description="Search blue-collar and hourly job listings" />

      <div className="border-b p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[220px] space-y-1.5">
            <Label className="text-xs font-medium">Query</Label>
            <Input placeholder="e.g. forklift operator" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Location</Label>
            <Input placeholder="e.g. Dallas, TX" value={location} onChange={(e) => setLocation(e.target.value)} className="w-48" />
          </div>
          <Button onClick={handleSearch} disabled={search.isPending}>
            {search.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
            Search
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {search.isError && <ErrorDisplay message={search.error.message} />}
        {search.isSuccess && jobs.length === 0 && (
          <EmptyState icon={HardHat} title="No jobs found" description="Try a different query or location." />
        )}
        {jobs.length > 0 && (
          <div className="mx-auto max-w-2xl space-y-3">
            {total != null && <p className="text-xs text-muted-foreground">{total.toLocaleString()} matching jobs</p>}
            {jobs.map((j, i) => {
              const pay = comp(j);
              return (
                <Card key={i}>
                  <CardContent className="pt-4 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium">{(j.title as string) ?? "Untitled role"}</p>
                      {pay && <Badge variant="secondary" className="text-xs shrink-0">{pay}</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">{(j.companyName as string) ?? ""}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {(j.location as string) && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{j.location as string}</span>}
                      {(j.url as string) && (
                        <a href={j.url as string} target="_blank" rel="noopener noreferrer" className="ml-auto flex items-center gap-1 text-primary hover:underline">
                          View listing <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
        {!search.data && !search.isPending && !search.isError && (
          <EmptyState icon={HardHat} title="Blue-collar job search" description="Enter a query and/or location to find hourly and trade jobs." />
        )}
      </div>
    </div>
  );
}
