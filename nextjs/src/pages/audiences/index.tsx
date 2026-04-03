import { useRouter } from "next/router";
import { Users } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Header } from "@/components/layout/header";
import { AudienceCard } from "@/components/audiences/audience-card";
import { CreateAudienceDialog } from "@/components/audiences/create-audience-dialog";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorDisplay } from "@/components/shared/error-display";

export default function AudiencesPage() {
  const router = useRouter();
  const utils = trpc.useUtils();

  const audiencesList = trpc.audiences.list.useQuery(undefined, {
    staleTime: 10_000,
  });

  const createMutation = trpc.audiences.create.useMutation({
    onSuccess: (data) => {
      utils.audiences.list.invalidate();
      
      if (data?.output?.audienceId) {
        router.push(`/audiences/${data.output.audienceId}`);
      }
    },
  });

  const listData = audiencesList.data;

  const audiences = listData?.output?.audiences ?? [];

  return (
    <div className="flex h-full flex-col">
      <Header title="Audiences" description="Manage your saved audiences">
        <CreateAudienceDialog
          onSubmit={(name) => createMutation.mutate({ name })}
          isLoading={createMutation.isPending}
        />
      </Header>

      <div className="flex-1 overflow-y-auto p-6">
        {audiencesList.isLoading && <LoadingSkeleton rows={4} />}

        {audiencesList.isError && (
          <ErrorDisplay
            message={audiencesList.error.message}
            onRetry={() => audiencesList.refetch()}
          />
        )}

        {audiences.length === 0 && audiencesList.isSuccess && (
          <EmptyState
            icon={Users}
            title="No audiences yet"
            description="Create an audience to save and organize your search results."
          >
            <CreateAudienceDialog
              onSubmit={(name) => createMutation.mutate({ name })}
              isLoading={createMutation.isPending}
            />
          </EmptyState>
        )}

        {audiences.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {audiences.map((audience) => (
              <AudienceCard
                key={audience.audienceId}
                audienceId={audience.audienceId}
                name={audience.name}
                status={audience.status}
                companiesCount={audience.companiesCount}
                prospectsCount={audience.prospectsCount}
                createdAt={audience.createdAt}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
