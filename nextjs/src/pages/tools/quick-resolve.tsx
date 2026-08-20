import { useState } from "react";
import { Fingerprint, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ErrorDisplay } from "@/components/shared/error-display";
import { EmptyState } from "@/components/shared/empty-state";
import { FiberAvatar } from "@/components/shared/fiber-avatar";
import { ToggleButtonGroup } from "@/components/shared/toggle-button-group";

type Mode = "people" | "companies";
type Row = Record<string, unknown>;

function detectPersonIdentifier(v: string): { identifier: "linkedinUrl" | "linkedinSlug" | "linkedinUserId" | "entityUrn"; value: string } {
  if (v.includes("linkedin.com/")) return { identifier: "linkedinUrl", value: v };
  if (/^\d+$/.test(v)) return { identifier: "linkedinUserId", value: v };
  if (/^ACo/.test(v)) return { identifier: "entityUrn", value: v };
  return { identifier: "linkedinSlug", value: v };
}

function detectCompanyIdentifier(v: string): { identifier: "linkedinUrl" | "linkedinSlug" | "linkedinOrgId" | "domain"; value: string } {
  if (v.includes("linkedin.com/")) return { identifier: "linkedinUrl", value: v };
  if (/^\d+$/.test(v)) return { identifier: "linkedinOrgId", value: v };
  if (v.includes(".")) return { identifier: "domain", value: v };
  return { identifier: "linkedinSlug", value: v };
}

export default function QuickResolvePage() {
  const [mode, setMode] = useState<Mode>("people");
  const [raw, setRaw] = useState("");

  const peopleMutation = trpc.tools.quickResolvePeople.useMutation();
  const companiesMutation = trpc.tools.quickResolveCompanies.useMutation();
  const mutation = mode === "people" ? peopleMutation : companiesMutation;

  const handleSubmit = () => {
    const values = raw.split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 100);
    if (values.length === 0) return;
    if (mode === "people") {
      peopleMutation.mutate({ people: values.map(detectPersonIdentifier) });
    } else {
      companiesMutation.mutate({ companies: values.map(detectCompanyIdentifier) });
    }
  };

  const results = (mutation.data?.output?.data ?? []) as Row[];

  return (
    <div className="flex h-full flex-col">
      <Header icon={Fingerprint} title="Quick Resolve" description="Cheap identifier → full profile lookups, charged only for the ones that resolve" />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-3xl space-y-6">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <ToggleButtonGroup
                options={[
                  { value: "people", label: "People" },
                  { value: "companies", label: "Companies" },
                ]}
                value={mode}
                onChange={(v) => setMode(v as Mode)}
              />
              <div className="space-y-2">
                <Label>{mode === "people" ? "People" : "Companies"} (one per line, max 100)</Label>
                <Textarea
                  rows={6}
                  placeholder={mode === "people"
                    ? "https://www.linkedin.com/in/williamhgates\nwilliamhgates\n251749025"
                    : "stripe.com\nhttps://www.linkedin.com/company/stripe\nstripe"}
                  value={raw}
                  onChange={(e) => setRaw(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {mode === "people"
                    ? "LinkedIn URL, slug, numeric user ID, or entity URN. Auto-detected per line."
                    : "Domain, LinkedIn company URL, slug, or org ID. Auto-detected per line."}
                </p>
              </div>
              <Button onClick={handleSubmit} disabled={!raw.trim() || mutation.isPending}>
                {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Fingerprint className="mr-2 h-4 w-4" />}
                Resolve
              </Button>
            </CardContent>
          </Card>

          {mutation.isError && <ErrorDisplay message={mutation.error!.message} />}

          {results.length > 0 && (
            <Card>
              <CardContent className="pt-6 space-y-3">
                {results.map((r, i) => {
                  const entity = (mode === "people" ? r.person : r.company) as Row | undefined;
                  const name = (entity?.full_name ?? entity?.preferred_name ?? entity?.name) as string | undefined;
                  const pic = (entity?.profile_pic_url ?? entity?.logo_url) as string | undefined;
                  const headline = (entity?.headline ?? entity?.one_liner ?? entity?.description) as string | undefined;
                  return (
                    <div key={i} className="flex items-center gap-3 border-b pb-3 last:border-0 last:pb-0">
                      <FiberAvatar src={pic} alt={name ?? (r.value as string)} type={mode === "people" ? "person" : "company"} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{name ?? (r.value as string)}</p>
                        {headline && <p className="text-xs text-muted-foreground truncate">{headline}</p>}
                        <p className="text-xs text-muted-foreground font-mono truncate">{r.identifier as string}: {r.value as string}</p>
                      </div>
                      <Badge variant={r.found ? "default" : "secondary"}>{r.found ? "Found" : "Not found"}</Badge>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {!mutation.data && !mutation.isPending && !mutation.isError && (
            <EmptyState icon={Fingerprint} title="Resolve identifiers" description="Paste LinkedIn URLs, slugs, IDs, or domains to fetch full profiles." />
          )}
        </div>
      </div>
    </div>
  );
}
