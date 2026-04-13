import { useState } from "react";
import { Users, Loader2, User, Building2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ErrorDisplay } from "@/components/shared/error-display";
import { ToggleButtonGroup } from "@/components/shared/toggle-button-group";

type Mode = "profile" | "company";

export default function BulkEnrichPage() {
  const [mode, setMode] = useState<Mode>("profile");
  const [input, setInput] = useState("");

  const profileMutation = trpc.linkedin.bulkLiveEnrichProfile.useMutation();
  const companyMutation = trpc.linkedin.bulkLiveEnrichCompany.useMutation();

  const handleSubmit = () => {
    const lines = input.split("\n").map((s) => s.trim()).filter(Boolean);
    if (lines.length === 0) return;

    if (mode === "profile") {
      profileMutation.mutate({ identifiers: lines });
    } else {
      companyMutation.mutate({
        identifiers: lines.map((line) => {
          if (line.includes("linkedin.com")) return { type: "liUrl" as const, value: line };
          if (/^\d+$/.test(line)) return { type: "orgId" as const, value: line };
          return { type: "slug" as const, value: line };
        }),
      });
    }
  };

  const activeMutation = mode === "profile" ? profileMutation : companyMutation;
  const results = activeMutation.data?.output;

  // Try to extract an array from the response
  const resultItems = (
    results && typeof results === "object"
      ? (results.profiles ?? results.companies ?? results.results ?? results.data) as Record<string, unknown>[] | undefined
      : undefined
  );

  return (
    <div className="flex h-full flex-col">
      <Header icon={Users} title="Bulk Live Enrich" description="Fetch fresh LinkedIn data for multiple profiles or companies at once" />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-3xl space-y-6">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <ToggleButtonGroup
                options={[
                  { value: "profile" as Mode, label: "Profiles", icon: User },
                  { value: "company" as Mode, label: "Companies", icon: Building2 },
                ]}
                value={mode}
                onChange={(v) => setMode(v as Mode)}
              />

              <div className="space-y-2">
                <Label>
                  {mode === "profile"
                    ? "LinkedIn Profile URLs or slugs (one per line)"
                    : "LinkedIn Company URLs, slugs, or org IDs (one per line)"}
                </Label>
                <Textarea
                  className="min-h-[140px] font-mono text-xs"
                  placeholder={
                    mode === "profile"
                      ? "https://www.linkedin.com/in/person-1\nhttps://www.linkedin.com/in/person-2"
                      : "https://www.linkedin.com/company/stripe\nmicrosoft\n1035"
                  }
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                />
                {input.trim() && (
                  <p className="text-xs text-muted-foreground">
                    {input.split("\n").filter((s) => s.trim()).length} {mode === "profile" ? "profiles" : "companies"} to enrich
                  </p>
                )}
              </div>

              <Button onClick={handleSubmit} disabled={!input.trim() || activeMutation.isPending}>
                {activeMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Users className="mr-2 h-4 w-4" />}
                Enrich All
              </Button>
            </CardContent>
          </Card>

          {activeMutation.isError && <ErrorDisplay message={activeMutation.error.message} />}

          {activeMutation.isSuccess && resultItems && resultItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Results <Badge variant="secondary" className="ml-2">{resultItems.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {resultItems.map((item, i) => (
                    <div key={i} className="rounded-md border p-3 text-sm">
                      <p className="font-medium">
                        {(item.name as string) ?? (item.preferred_name as string) ?? (item.first_name as string) ?? `Result ${i + 1}`}
                      </p>
                      {(item.headline as string) && <p className="text-xs text-muted-foreground">{item.headline as string}</p>}
                      {(item.description as string) && <p className="text-xs text-muted-foreground line-clamp-2">{item.description as string}</p>}
                      {(item.linkedinUrl as string) && (
                        <a href={item.linkedinUrl as string} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                          {item.linkedinUrl as string}
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {activeMutation.isSuccess && !resultItems && (
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm font-medium mb-2">Raw Response</p>
                <pre className="text-xs overflow-x-auto bg-muted p-4 rounded-md max-h-64">
                  {JSON.stringify(results, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
}
