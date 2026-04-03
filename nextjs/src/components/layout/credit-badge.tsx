import { CreditCard } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { formatCredits } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface CreditBadgeProps {
  collapsed: boolean;
}

export function CreditBadge({ collapsed }: CreditBadgeProps) {
  const credits = trpc.utility.getCredits.useQuery(undefined, {
    staleTime: 30_000,
    retry: false,
  });

  if (credits.isLoading) {
    return <Skeleton className="h-8 w-full" />;
  }

  if (credits.isError || !credits.data) {
    return null;
  }

  const data = credits.data as { output?: { available?: number } };
  const available = data.output?.available ?? 0;

  if (collapsed) {
    return (
      <div className="flex items-center justify-center" title={`${available} credits`}>
        <CreditCard className="h-4 w-4 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm">
      <CreditCard className="h-4 w-4 text-muted-foreground" />
      <span className="text-muted-foreground">Credits:</span>
      <span className="font-medium">{formatCredits(available)}</span>
    </div>
  );
}
