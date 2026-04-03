import { Hash, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { formatNumber } from "@/lib/utils";
import type { CompanySearchParams } from "@/lib/schemas/search";

interface SearchCountBadgeProps {
  searchParams: CompanySearchParams;
}

export function SearchCountBadge({ searchParams }: SearchCountBadgeProps) {
  const debouncedParams = useDebouncedValue(searchParams, 800);

  const hasFilters = Object.keys(debouncedParams).length > 0;

  const count = trpc.search.companyCount.useQuery(
    { searchParams: debouncedParams },
    {
      enabled: hasFilters,
      staleTime: 0,
      retry: false,
    }
  );

  if (!hasFilters) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Hash className="h-4 w-4" />
        <span>Add filters to see match count</span>
      </div>
    );
  }

  if (count.isLoading || count.isFetching) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Counting matches...</span>
      </div>
    );
  }

  if (count.isError) {
    return (
      <div className="flex items-center gap-2 text-sm text-destructive">
        <Hash className="h-4 w-4" />
        <span>Could not get count</span>
      </div>
    );
  }

  const total = (count.data as { output?: { count?: number } })?.output?.count ?? 0;

  return (
    <div className="flex items-center gap-2 text-sm">
      <Hash className="h-4 w-4 text-primary" />
      <span>
        <span className="font-semibold">{formatNumber(total)}</span>{" "}
        companies match
      </span>
    </div>
  );
}
