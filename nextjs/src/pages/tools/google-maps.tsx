import { useState, useEffect } from "react";
import { MapPin, ExternalLink, Globe, Star, DollarSign, History, Trash2, Search } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PollingIndicator } from "@/components/shared/polling-indicator";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorDisplay } from "@/components/shared/error-display";
import { CopyButton } from "@/components/shared/copy-button";
import { useCreditCosts } from "@/hooks/use-credit-costs";

interface MapsResult {
  placeId: string;
  name: string;
  address?: string | null;
  website?: string | null;
  rating?: number | null;
  numReviews?: number | null;
  phoneNumber?: string | null;
  primaryType?: string | null;
  priceLevel?: string | null;
  googleMapsURL: string;
}

interface SavedProject {
  searchID: string;
  query: string;
  createdAt: string;
}

const STORAGE_KEY = "openfiber-gmaps-projects";

function loadProjects(): SavedProject[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveProject(project: SavedProject) {
  const projects = loadProjects();
  // Dedupe by searchID
  const updated = [project, ...projects.filter((p) => p.searchID !== project.searchID)].slice(0, 20);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

function removeProject(searchID: string) {
  const projects = loadProjects().filter((p) => p.searchID !== searchID);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

const PRICE_LABELS: Record<string, string> = {
  PRICE_LEVEL_FREE: "Free",
  PRICE_LEVEL_INEXPENSIVE: "$",
  PRICE_LEVEL_MODERATE: "$$",
  PRICE_LEVEL_EXPENSIVE: "$$$",
  PRICE_LEVEL_VERY_EXPENSIVE: "$$$$",
};

export default function GoogleMapsPage() {
  const [query, setQuery] = useState("");
  const [searchID, setSearchID] = useState<string | null>(null);
  const [pageSize] = useState(25);
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const costs = useCreditCosts();

  // Load project history on mount
  useEffect(() => {
    setProjects(loadProjects());
  }, []);

  const startSearch = trpc.tools.startGoogleMapsSearch.useMutation({
    onSuccess: (data) => {
      
      const id = data?.output?.searchID;
      if (id) {
        setSearchID(id);
        const project: SavedProject = { searchID: id, query: query.trim(), createdAt: new Date().toISOString() };
        saveProject(project);
        setProjects(loadProjects());
      }
    },
  });

  const checkResults = trpc.tools.checkGoogleMapsResults.useQuery(
    { searchID: searchID! },
    {
      enabled: !!searchID,
      refetchInterval: (q) => {
        const d = q.state.data;
        if (d?.output?.status === "COMPLETED" || d?.output?.status === "FAILED") return false;
        return 3000;
      },
    }
  );

  const checkData = checkResults.data;
  const isComplete = checkData?.output?.status === "COMPLETED";

  const pollResults = trpc.tools.pollGoogleMapsResults.useQuery(
    { searchID: searchID!, pageSize },
    { enabled: !!searchID && isComplete }
  );

  const pollData = pollResults.data;
  const results = pollData?.output?.results ?? [];

  const handleSearch = () => {
    if (!query.trim()) return;
    setSearchID(null);
    setShowHistory(false);
    startSearch.mutate({
      query: query.trim(),
      maxResults: 100,
      strategy: { strategy: "whole-usa" },
    });
  };

  const handleLoadProject = (project: SavedProject) => {
    setQuery(project.query);
    setSearchID(project.searchID);
    setShowHistory(false);
  };

  const handleDeleteProject = (id: string) => {
    removeProject(id);
    setProjects(loadProjects());
    if (searchID === id) setSearchID(null);
  };

  const isPolling = !!searchID && !isComplete && checkData?.output?.status !== "FAILED";

  return (
    <div className="flex h-full flex-col">
      <Header title="Google Maps" description={`Extract local business listings (${costs.googleMaps} credits/result)`}>
        <Button
          variant={showHistory ? "default" : "outline"}
          size="sm"
          onClick={() => setShowHistory(!showHistory)}
        >
          <History className="mr-2 h-4 w-4" />
          History ({projects.length})
        </Button>
      </Header>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-5xl space-y-6">
          {/* Project History */}
          {showHistory && (
            <Card>
              <CardHeader><CardTitle className="text-base">Recent Searches</CardTitle></CardHeader>
              <CardContent>
                {projects.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No previous searches.</p>
                ) : (
                  <div className="space-y-1">
                    {projects.map((p) => (
                      <div key={p.searchID} className="flex items-center justify-between rounded-md border px-3 py-2">
                        <button
                          type="button"
                          className="flex-1 text-left text-sm hover:underline"
                          onClick={() => handleLoadProject(p)}
                        >
                          <span className="font-medium">{p.query}</span>
                          <span className="ml-2 text-xs text-muted-foreground">
                            {new Date(p.createdAt).toLocaleDateString()}
                          </span>
                        </button>
                        <Button
                          variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteProject(p.searchID)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Search Form */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label>Search Query</Label>
                <Input
                  placeholder='e.g. "coffee shops", "real estate agents", "plumbers"'
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>
              <Button onClick={handleSearch} disabled={!query.trim() || startSearch.isPending || isPolling}>
                {startSearch.isPending ? (
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <Search className="mr-2 h-4 w-4" />
                )}
                Search Google Maps
              </Button>
            </CardContent>
          </Card>

          {startSearch.isError && <ErrorDisplay message={startSearch.error.message} />}

          {isPolling && (
            <PollingIndicator
              message={`Searching... ${checkData?.output?.percentageCompleted ?? 0}% complete (${checkData?.output?.totalPlacesFound ?? 0} places found)`}
            />
          )}

          {/* Results */}
          {isComplete && results.length > 0 && (
            <div className="rounded-md border overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-2 text-left font-medium">Business</th>
                    <th className="px-4 py-2 text-left font-medium">Address</th>
                    <th className="px-4 py-2 text-left font-medium">Phone</th>
                    <th className="px-4 py-2 text-left font-medium">Rating</th>
                    <th className="px-4 py-2 text-left font-medium">Price</th>
                    <th className="px-4 py-2 text-left font-medium">Links</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r) => (
                    <tr key={r.placeId} className="border-b">
                      <td className="px-4 py-2">
                        <p className="font-medium">{r.name}</p>
                        {r.primaryType && <Badge variant="outline" className="text-xs mt-0.5">{r.primaryType}</Badge>}
                      </td>
                      <td className="px-4 py-2 text-muted-foreground max-w-[200px] truncate">{r.address ?? "-"}</td>
                      <td className="px-4 py-2">
                        {r.phoneNumber ? (
                          <div className="flex items-center gap-1">
                            <span className="font-mono text-xs">{r.phoneNumber}</span>
                            <CopyButton value={r.phoneNumber} />
                          </div>
                        ) : "-"}
                      </td>
                      <td className="px-4 py-2">
                        {r.rating != null ? (
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            <span>{r.rating}</span>
                            {r.numReviews != null && <span className="text-xs text-muted-foreground">({r.numReviews})</span>}
                          </div>
                        ) : "-"}
                      </td>
                      <td className="px-4 py-2">
                        {r.priceLevel ? (
                          <span className="text-sm font-medium">{PRICE_LABELS[r.priceLevel] ?? r.priceLevel}</span>
                        ) : "-"}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          {r.website && (
                            <a href={r.website} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                              <Globe className="h-4 w-4" />
                            </a>
                          )}
                          <a href={r.googleMapsURL} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {isComplete && results.length === 0 && (
            <EmptyState icon={MapPin} title="No results" description="No businesses found for this query." />
          )}

          {!searchID && !startSearch.isPending && !showHistory && (
            <EmptyState icon={MapPin} title="Google Maps Scraping" description="Search for local businesses across the US." />
          )}
        </div>
      </div>
    </div>
  );
}
