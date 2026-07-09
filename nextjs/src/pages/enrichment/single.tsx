import { useState } from "react";
import { Mail, User, Search, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Header } from "@/components/layout/header";
import { EnrichmentForm, type EnrichmentOptions, type RevealVariant } from "@/components/enrichment/enrichment-form";
import { PollingIndicator } from "@/components/shared/polling-indicator";
import { EnrichmentResultCard } from "@/components/enrichment/enrichment-result-card";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorDisplay } from "@/components/shared/error-display";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/shared/copy-button";

export default function SingleEnrichmentPage() {
  const [tab, setTab] = useState<"linkedin" | "name" | "email">("linkedin");
  const [activeLinkedInVariant, setActiveLinkedInVariant] = useState<RevealVariant | null>(null);

  const [exhaustiveTaskId, setExhaustiveTaskId] = useState<string | null>(null);

  // Sync reveal mutations — one per variant
  const standardMutation = trpc.enrichment.syncStandardReveal.useMutation();
  const premiumMutation = trpc.enrichment.syncPremiumReveal.useMutation();
  const exhaustiveTrigger = trpc.enrichment.triggerExhaustiveReveal.useMutation();

  // Exhaustive async polling
  const exhaustivePoll = trpc.enrichment.pollExhaustiveReveal.useQuery(
    { taskId: exhaustiveTaskId! },
    {
      enabled: !!exhaustiveTaskId,
      refetchInterval: (q) => {
        const profile = q.state.data?.output?.profile;
        if (profile && (profile.status === "completed" || profile.status === "failed")) return false;
        return 3000;
      },
    }
  );

  const emailLookup = trpc.linkedin.reverseEmailLookup.useMutation();
  const kitchenSink = trpc.linkedin.kitchenSinkProfile.useMutation();
  const [emailInput, setEmailInput] = useState("");
  const [personName, setPersonName] = useState("");
  const [personEmail, setPersonEmail] = useState("");

  // Map variant → mutation for clean routing
  const syncMutations = {
    standard: standardMutation,
    premium: premiumMutation,
    exhaustive: exhaustiveTrigger, // trigger only, polling is separate
  } as const;

  const handleLinkedInSubmit = (linkedinUrl: string, options: EnrichmentOptions, variant: RevealVariant) => {
    setActiveLinkedInVariant(variant);
    // Reset exhaustive polling state
    setExhaustiveTaskId(null);

    if (variant === "exhaustive") {
      exhaustiveTrigger.mutate(
        { linkedinUrl, enrichmentType: options },
        {
          onSuccess: (data) => {
            if (data?.output?.taskId) setExhaustiveTaskId(data.output.taskId);
          },
        }
      );
    } else {
      syncMutations[variant].mutate({ linkedinUrl, enrichmentType: options });
    }
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (emailInput.trim()) emailLookup.mutate({ email: emailInput.trim() });
  };

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!personName.trim()) return;
    kitchenSink.mutate({
      personName: { value: personName.trim(), looseMatch: true },
      emailAddress: personEmail.trim() || null,
    });
  };

  // Pick the result from the active variant only (avoids stale data from prior variants)
  const enrichResult = (() => {
    switch (activeLinkedInVariant) {
      case "standard": return standardMutation.data ?? null;
      case "premium": return premiumMutation.data ?? null;
      case "exhaustive": return exhaustivePoll.data ?? null;
      default: return null;
    }
  })();
  const emailResult = emailLookup.data;
  const nameResult = kitchenSink.data;

  const isSyncLoading = standardMutation.isPending || premiumMutation.isPending;
  const isExhaustivePolling = !!exhaustiveTaskId && !exhaustivePoll.data?.output?.profile?.status?.match(/completed|failed/);
  const syncError = (() => {
    switch (activeLinkedInVariant) {
      case "standard": return standardMutation.error ?? null;
      case "premium": return premiumMutation.error ?? null;
      case "exhaustive": return exhaustiveTrigger.error ?? null;
      default: return null;
    }
  })();

  return (
    <div className="flex h-full flex-col">
      <Header
        title="Single Lookup"
        description="Find verified emails and phone numbers for any person"
      />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-2xl space-y-6">
          {/* Tab Toggle */}
          <div className="flex gap-2">
            <Button
              variant={tab === "linkedin" ? "default" : "outline"}
              size="sm"
              onClick={() => setTab("linkedin")}
            >
              LinkedIn URL
            </Button>
            <Button
              variant={tab === "name" ? "default" : "outline"}
              size="sm"
              onClick={() => setTab("name")}
            >
              <User className="mr-1.5 h-4 w-4" />
              Name Lookup
            </Button>
            <Button
              variant={tab === "email" ? "default" : "outline"}
              size="sm"
              onClick={() => setTab("email")}
            >
              Email-to-Person
            </Button>
          </div>

          {/* LinkedIn Lookup */}
          {tab === "linkedin" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Contact Enrichment</CardTitle>
              </CardHeader>
              <CardContent>
                <EnrichmentForm
                  onSubmit={handleLinkedInSubmit}
                  isLoading={isSyncLoading || exhaustiveTrigger.isPending}
                />
              </CardContent>
            </Card>
          )}

          {/* Name + Email Lookup (Kitchen Sink) */}
          {tab === "name" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Name Lookup</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleNameSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Person Name</Label>
                    <Input
                      placeholder="e.g. John Smith"
                      value={personName}
                      onChange={(e) => setPersonName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email (optional, improves accuracy)</Label>
                    <Input
                      type="email"
                      placeholder="john@company.com"
                      value={personEmail}
                      onChange={(e) => setPersonEmail(e.target.value)}
                    />
                  </div>
                  <Button type="submit" disabled={!personName.trim() || kitchenSink.isPending} className="w-full">
                    {kitchenSink.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="mr-2 h-4 w-4" />
                    )}
                    Look Up Person
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Name Lookup Results */}
          {tab === "name" && kitchenSink.isError && (
            <ErrorDisplay message={kitchenSink.error.message} />
          )}
          {tab === "name" && nameResult?.output && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Person Found</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(() => {
                  const p = nameResult.output;
                  const name = String(p.firstName ?? "") + " " + String(p.lastName ?? "");
                  const title = p.title;
                  const company = p.company;
                  const email = p.email;
                  const linkedinUrl = p.linkedinUrl;
                  const phone = p.phone;
                  return (
                    <div className="space-y-3">
                      <div>
                        <p className="font-medium text-lg">{name.trim() || "Unknown"}</p>
                        {title && <p className="text-sm text-muted-foreground">{title}{company ? ` at ${company}` : ""}</p>}
                      </div>
                      {email && (
                        <div className="flex items-center gap-2 rounded-md border px-3 py-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-mono">{email}</span>
                          <CopyButton value={email} />
                        </div>
                      )}
                      {phone && (
                        <div className="flex items-center gap-2 rounded-md border px-3 py-2">
                          <span className="text-sm">Phone:</span>
                          <span className="text-sm font-mono">{phone}</span>
                          <CopyButton value={phone} />
                        </div>
                      )}
                      {linkedinUrl && (
                        <a href={linkedinUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                          View LinkedIn Profile
                        </a>
                      )}
                      {!email && !phone && !linkedinUrl && (
                        <p className="text-sm text-muted-foreground">No contact information found.</p>
                      )}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          )}

          {/* Email Reverse Lookup */}
          {tab === "email" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Email-to-Person Lookup</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleEmailSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Email Address</Label>
                    <Input
                      type="email"
                      placeholder="john@company.com"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                    />
                  </div>
                  <Button type="submit" disabled={!emailInput.trim() || emailLookup.isPending} className="w-full">
                    {emailLookup.isPending ? (
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    ) : (
                      <Mail className="mr-2 h-4 w-4" />
                    )}
                    Look Up Person
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* LinkedIn Results */}
          {tab === "linkedin" && syncError && (
            <ErrorDisplay message={syncError.message} />
          )}
          {tab === "linkedin" && isExhaustivePolling && (
            <PollingIndicator message="Running exhaustive enrichment..." />
          )}
          {tab === "linkedin" && enrichResult?.output && (
            <EnrichmentResultCard
              emails={enrichResult.output.profile?.emails ?? []}
              phoneNumbers={enrichResult.output.profile?.phoneNumbers ?? []}
              status={enrichResult.output.profile?.status ?? "completed"}
              error={enrichResult.output.profile?.error}
            />
          )}

          {/* Email Results */}
          {tab === "email" && emailLookup.isError && (
            <ErrorDisplay message={emailLookup.error.message} />
          )}
          {tab === "email" && emailResult?.output?.data && emailResult.output.data.length > 0 && (
            <>
              {emailResult.output.data.map((person, i) => {
                const name = (person.name) ?? ([person.first_name, person.last_name].filter(Boolean).join(" ") || "Unknown");
                const headline = person.headline;
                const summary = person.summary;
                const profilePic = person.profile_pic;
                const slug = person.primary_slug;
                const locality = person.locality;
                const industryName = person.industry_name;
                const connectionCount = person.connection_count;
                const currentJob = person.current_job;
                const skills = person.skills;
                const tags = person.tags;

                return (
                  <Card key={i}>
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        {profilePic ? (
                          <img src={profilePic} alt={name} className="h-12 w-12 rounded-full border object-cover" />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-full border bg-muted">
                            <Mail className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <CardTitle className="text-lg">{name}</CardTitle>
                          {headline && <p className="text-sm text-muted-foreground">{headline}</p>}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {summary && <p className="text-sm text-muted-foreground">{summary}</p>}

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {currentJob?.title && (
                          <div>
                            <p className="font-medium">{currentJob.title}</p>
                            {currentJob.company_name && <p className="text-xs text-muted-foreground">{currentJob.company_name}</p>}
                          </div>
                        )}
                        {locality && <p className="text-muted-foreground">{locality}</p>}
                        {industryName && <p className="text-muted-foreground">{industryName}</p>}
                        {connectionCount != null && <p className="text-muted-foreground">{connectionCount.toLocaleString()} connections</p>}
                      </div>

                      {tags && tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {tags.map((tag) => (
                            <span key={tag} className="rounded-md bg-muted px-2 py-0.5 text-xs">{String(tag).replace(/-/g, " ")}</span>
                          ))}
                        </div>
                      )}

                      {skills && skills.length > 0 && (
                        <div>
                          <p className="mb-1 text-xs font-medium">Skills</p>
                          <div className="flex flex-wrap gap-1">
                            {skills.slice(0, 10).map((s) => (
                              <span key={s} className="rounded-md border px-2 py-0.5 text-xs">{s}</span>
                            ))}
                            {skills.length > 10 && <span className="rounded-md border px-2 py-0.5 text-xs">+{skills.length - 10}</span>}
                          </div>
                        </div>
                      )}

                      {slug && (
                        <a
                          href={`https://www.linkedin.com/in/${slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                          View LinkedIn Profile
                        </a>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </>
          )}
          {tab === "email" && emailResult?.output?.data?.length === 0 && (
            <EmptyState
              icon={Mail}
              title="No person found"
              description="No LinkedIn profile was found matching this email address."
            />
          )}

          {/* Empty state */}
          {!enrichResult && !emailResult && !nameResult && !isSyncLoading && !isExhaustivePolling && !emailLookup.isPending && !kitchenSink.isPending && (
            <EmptyState
              icon={Mail}
              title="Contact Enrichment"
              description="Enter a LinkedIn URL or email to find verified contact information."
            />
          )}
        </div>
      </div>
    </div>
  );
}
