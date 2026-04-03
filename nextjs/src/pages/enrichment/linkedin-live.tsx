import { useState } from "react";
import { Globe } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Header } from "@/components/layout/header";
import { LinkedInLiveForm } from "@/components/enrichment/linkedin-live-form";
import { LinkedInLiveResult } from "@/components/enrichment/linkedin-live-result";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorDisplay } from "@/components/shared/error-display";

type ResultType = "profile" | "company" | null;

export default function LinkedInLivePage() {
  const [resultType, setResultType] = useState<ResultType>(null);

  const profileMutation = trpc.linkedin.profileLiveEnrich.useMutation();
  const companyMutation = trpc.linkedin.companyLiveEnrich.useMutation();

  const handleProfileLookup = (identifier: string) => {
    setResultType("profile");
    profileMutation.mutate({
      identifier,
      getDetailedEducation: true,
      getDetailedWorkExperience: true,
    });
  };

  const handleCompanyLookup = (value: string) => {
    setResultType("company");
    // Determine type from input
    let type: "slug" | "orgId" | "liUrl" = "slug";
    if (value.includes("linkedin.com")) type = "liUrl";
    else if (/^\d+$/.test(value)) type = "orgId";
    companyMutation.mutate({ type, value });
  };

  const isLoading = profileMutation.isPending || companyMutation.isPending;
  const profileResult = profileMutation.data;
  const companyResult = companyMutation.data;
  const activeError = resultType === "profile" ? profileMutation.error : resultType === "company" ? companyMutation.error : null;

  return (
    <div className="flex h-full flex-col">
      <Header
        title="LinkedIn Live"
        description="Real-time LinkedIn profile and company data (2 credits per lookup)"
      />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-2xl space-y-6">
          <LinkedInLiveForm
            onProfileLookup={handleProfileLookup}
            onCompanyLookup={handleCompanyLookup}
            isLoading={isLoading}
          />

          {activeError && (
            <ErrorDisplay message={activeError.message} />
          )}

          {resultType === "profile" && profileResult?.output?.profile && (
            <LinkedInLiveResult
              type="profile"
              profile={profileResult.output.profile as Record<string, unknown>}
            />
          )}

          {resultType === "company" && companyResult?.output?.company && (
            <LinkedInLiveResult
              type="company"
              company={companyResult.output.company as Record<string, unknown>}
            />
          )}

          {!resultType && !isLoading && (
            <EmptyState
              icon={Globe}
              title="LinkedIn Live Enrichment"
              description="Fetch real-time data from any LinkedIn profile or company page."
            />
          )}
        </div>
      </div>
    </div>
  );
}
