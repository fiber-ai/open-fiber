import { useState } from "react";
import { Image as ImageIcon, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorDisplay } from "@/components/shared/error-display";
import { CopyButton } from "@/components/shared/copy-button";
import { ToggleButtonGroup } from "@/components/shared/toggle-button-group";

type IdType = "domains" | "linkedinUrls" | "liOrgIds";
type Row = Record<string, unknown>;

const LABELS: Record<IdType, string> = {
  domains: "Domains",
  linkedinUrls: "LinkedIn URLs",
  liOrgIds: "LinkedIn Org IDs",
};

export default function LogosPage() {
  const [type, setType] = useState<IdType>("domains");
  const [input, setInput] = useState("");

  const logos = trpc.media.companyLogos.useMutation();

  const handleSubmit = () => {
    const values = input.split("\n").map((s) => s.trim()).filter(Boolean);
    if (values.length === 0) return;
    logos.mutate({ type, values });
  };

  // output.data.data = [{ domain|linkedinUrl|liOrgId, logoUrl }]
  const items = ((logos.data?.output?.data as Row | undefined)?.data ?? []) as Row[];
  const idKey = type === "domains" ? "domain" : type === "linkedinUrls" ? "linkedinUrl" : "liOrgId";

  return (
    <div className="flex h-full flex-col">
      <Header icon={ImageIcon} title="Company Logos" description="Resolve company logos in bulk from domains, LinkedIn URLs, or org IDs" />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-3xl space-y-4">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <ToggleButtonGroup
                options={(Object.keys(LABELS) as IdType[]).map((t) => ({ value: t, label: LABELS[t] }))}
                value={type}
                onChange={(v) => setType(v as IdType)}
              />
              <div className="space-y-2">
                <Label>{LABELS[type]} (one per line)</Label>
                <Textarea
                  className="min-h-[120px] font-mono text-xs"
                  placeholder={type === "domains" ? "stripe.com\nmicrosoft.com" : type === "linkedinUrls" ? "https://www.linkedin.com/company/stripe" : "1035\n1441"}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                />
              </div>
              <Button onClick={handleSubmit} disabled={!input.trim() || logos.isPending}>
                {logos.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}
                Fetch Logos
              </Button>
            </CardContent>
          </Card>

          {logos.isError && <ErrorDisplay message={logos.error.message} />}

          {logos.isSuccess && items.length === 0 && (
            <EmptyState icon={ImageIcon} title="No logos" description="No logos were resolved for those identifiers." />
          )}

          {items.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {items.map((it, i) => {
                const id = (it[idKey] as string) ?? "";
                const logoUrl = it.logoUrl as string | undefined;
                return (
                  <Card key={i}>
                    <CardContent className="pt-4 flex flex-col items-center gap-2 text-center">
                      {logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={logoUrl} alt={id} className="h-14 w-14 rounded border object-contain" />
                      ) : (
                        <div className="flex h-14 w-14 items-center justify-center rounded border bg-muted"><ImageIcon className="h-5 w-5 text-muted-foreground" /></div>
                      )}
                      <p className="text-xs font-medium truncate w-full">{id}</p>
                      {logoUrl && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <span className="truncate max-w-[120px]">logo URL</span>
                          <CopyButton value={logoUrl} />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
