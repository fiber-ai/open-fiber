import { useState } from "react";
import { Briefcase, ExternalLink } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorDisplay } from "@/components/shared/error-display";

interface JobPosting {
  job_id: string;
  title?: string | null;
  company_name?: string | null;
  company_logo_url?: string | null;
  posted_at?: string | null;
  job_url?: string | null;
  seniority_level?: string | null;
  employment_type?: string | null;
  description?: string | null;
  applicant_range?: { gte?: number | null; lte?: number | null } | null;
}

export default function JobPostingSearchPage() {
  const [titleFilter, setTitleFilter] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");

  const searchMutation = trpc.search.jobPostingSearch.useMutation();

  const handleSearch = () => {
    const searchParams: Record<string, unknown> = {};
    if (titleFilter.trim()) searchParams.title = titleFilter.split(",").map((s) => s.trim()).filter(Boolean);
    if (companyFilter.trim()) searchParams.companies = { identifier: "domain", value: companyFilter.split(",").map((s) => s.trim()).filter(Boolean) };
    searchMutation.mutate({ searchParams, pageSize: 25 });
  };

  const result = searchMutation.data;
  const postings = result?.output?.data ?? [];

  return (
    <div className="flex h-full flex-col">
      <Header title="Job Posting Search" description="Find open job postings across companies" />

      <div className="border-b p-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Job Titles</Label>
            <Input placeholder="e.g. Software Engineer, Product Manager" value={titleFilter} onChange={(e) => setTitleFilter(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Company Domains</Label>
            <Input placeholder="e.g. stripe.com, google.com" value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)} />
          </div>
        </div>
        <Button className="mt-3" onClick={handleSearch} disabled={searchMutation.isPending}>
          {searchMutation.isPending ? (
            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <Briefcase className="mr-2 h-4 w-4" />
          )}
          Search Job Postings
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {searchMutation.isError && (
          <div className="p-6"><ErrorDisplay message={searchMutation.error.message} /></div>
        )}

        {postings.length > 0 && (
          <div className="p-4 space-y-3">
            {postings.map((job) => (
              <div key={job.job_id} className="rounded-md border p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium">{job.title ?? "Untitled"}</h3>
                    <p className="text-sm text-muted-foreground">{job.company_name ?? "Unknown company"}</p>
                  </div>
                  {job.job_url && (
                    <a href={job.job_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {job.seniority_level && <Badge variant="outline" className="text-xs">{job.seniority_level}</Badge>}
                  {job.employment_type && <Badge variant="secondary" className="text-xs">{job.employment_type}</Badge>}
                  {job.posted_at && <Badge variant="secondary" className="text-xs">{new Date(job.posted_at).toLocaleDateString()}</Badge>}
                  {job.applicant_range?.gte != null && (
                    <Badge variant="secondary" className="text-xs">{job.applicant_range.gte}+ applicants</Badge>
                  )}
                </div>
                {job.description && (
                  <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{job.description}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {searchMutation.isSuccess && postings.length === 0 && (
          <EmptyState icon={Briefcase} title="No postings found" description="Try different job titles or companies." />
        )}
        {!searchMutation.isSuccess && !searchMutation.isPending && !searchMutation.isError && (
          <EmptyState icon={Briefcase} title="Job Posting Search" description="Search for open positions across companies." />
        )}
      </div>
    </div>
  );
}
