import { useRouter } from "next/router";
import { BookmarkCheck, Clock } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorDisplay } from "@/components/shared/error-display";

export default function SavedSearchesPage() {
  const router = useRouter();

  const listQuery = trpc.savedSearches.list.useQuery(
    { pageSize: 50 },
    { staleTime: 10_000 }
  );

  const data = listQuery.data;
  const output = data?.output as Record<string, unknown> | undefined;
  const searches = ((output?.savedSearches ?? output?.data ?? []) as Array<Record<string, unknown>>);

  return (
    <div className="flex h-full flex-col">
      <Header title="Saved Searches" description="View and manage your recurring searches" />

      <div className="flex-1 overflow-y-auto p-6">
        {listQuery.isLoading && <LoadingSkeleton rows={4} />}
        {listQuery.isError && (
          <ErrorDisplay message={listQuery.error.message} onRetry={() => listQuery.refetch()} />
        )}

        {searches.length === 0 && listQuery.isSuccess && (
          <EmptyState
            icon={BookmarkCheck}
            title="No saved searches"
            description="Save a search from the company or prospect search page to see it here."
          />
        )}

        {searches.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {searches.map((s) => {
              const id = (s.savedSearchId ?? s.id) as string;
              const name = (s.name as string) ?? "Unnamed search";
              const status = (s.status as string) ?? "";
              const createdAt = (s.createdAt as string) ?? "";
              const freq = (s.spawnFrequencyDays as number) ?? null;

              return (
                <Card
                  key={id}
                  data-testid="list-item-row"
                  className="cursor-pointer transition-colors hover:bg-accent/50"
                  onClick={() => router.push(`/saved-searches/${id}`)}
                >
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-medium truncate">{name}</p>
                      {status && (
                        <Badge variant={status === "active" ? "default" : "secondary"} className="text-xs">
                          {status}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {createdAt && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(createdAt).toLocaleDateString()}
                        </span>
                      )}
                      {freq && (
                        <span>Every {freq} days</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
