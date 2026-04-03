import { useState } from "react";
import { Users } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Header } from "@/components/layout/header";
import { BatchUploadForm } from "@/components/enrichment/batch-upload-form";
import { BatchProgress } from "@/components/enrichment/batch-progress";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorDisplay } from "@/components/shared/error-display";

export default function BatchEnrichmentPage() {
  const [taskId, setTaskId] = useState<string | null>(null);

  const startBatch = trpc.enrichment.startBatchEnrichment.useMutation({
    onSuccess: (data) => {
      
      if (data?.output?.taskId) setTaskId(data.output.taskId);
    },
  });

  const pollBatch = trpc.enrichment.pollBatchEnrichment.useQuery(
    { taskId: taskId!, take: 100 },
    {
      enabled: !!taskId,
      refetchInterval: (query) => {
        const data = query.state.data;
        if (data?.output?.done) return false;
        return 3000;
      },
    }
  );

  const handleSubmit = (
    urls: string[],
    options: { getWorkEmails: boolean; getPersonalEmails: boolean; getPhoneNumbers: boolean }
  ) => {
    setTaskId(null);
    startBatch.mutate({
      people: urls.map((u) => ({ linkedinUrl: u })),
      enrichmentType: options,
    });
  };

  const pollResult = pollBatch.data;

  return (
    <div className="flex h-full flex-col">
      <Header
        title="Batch Enrichment"
        description="Enrich up to 10,000 contacts at once via CSV upload"
      />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-3xl space-y-6">
          {!taskId && (
            <BatchUploadForm onSubmit={handleSubmit} isLoading={startBatch.isPending} />
          )}

          {startBatch.isError && (
            <ErrorDisplay message={startBatch.error.message} />
          )}

          {taskId && (
            <BatchProgress
              stats={pollResult?.output?.overallStats ?? null}
              done={pollResult?.output?.done ?? false}
              results={pollResult?.output?.pageResults ?? []}
            />
          )}

          {!taskId && !startBatch.isPending && !startBatch.isError && (
            <EmptyState
              icon={Users}
              title="Batch Contact Enrichment"
              description="Upload a CSV file containing LinkedIn profile URLs to enrich contacts in bulk."
            />
          )}
        </div>
      </div>
    </div>
  );
}

interface PollResult {
  output?: {
    overallStats?: {
      totalPeopleToFetch: number;
      numCompleted: number;
      numRemaining: number;
      numRejected: number;
      numDuplicates: number;
    };
    done?: boolean;
    pageResults?: Array<{
      inputs: { linkedinUrl: { value: string } };
      outputs?: {
        emails: Array<{ email: string; type: string; status?: string }>;
        phoneNumbers: Array<{ number: string; type: string }>;
      } | null;
    }>;
    nextCursor?: string | null;
  };
}
