import { useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useCreditCosts } from "@/hooks/use-credit-costs";

interface EnrichmentFormProps {
  onSubmit: (linkedinUrl: string, options: EnrichmentOptions, variant: RevealVariant) => void;
  isLoading: boolean;
}

export interface EnrichmentOptions {
  getWorkEmails: boolean;
  getPersonalEmails: boolean;
  getPhoneNumbers: boolean;
}

/**
 * Reveal variants available in the Fiber API.
 * Each variant trades off speed, cost, and data quality differently.
 * The `id` matches the tRPC procedure suffix for easy routing.
 */
export const REVEAL_VARIANTS = [
  { id: "standard", label: "Standard", description: "Default enrichment" },
  { id: "slim", label: "Slim", description: "Faster, lighter data" },
  { id: "premium", label: "Premium", description: "Higher quality results" },
  { id: "druid", label: "Druid", description: "Streamlined enrichment" },
  { id: "exhaustive", label: "Exhaustive", description: "Most thorough (async)" },
] as const;

export type RevealVariant = typeof REVEAL_VARIANTS[number]["id"];

export function EnrichmentForm({ onSubmit, isLoading }: EnrichmentFormProps) {
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [variant, setVariant] = useState<RevealVariant>("standard");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [options, setOptions] = useState<EnrichmentOptions>({
    getWorkEmails: true,
    getPersonalEmails: false,
    getPhoneNumbers: false,
  });
  const costs = useCreditCosts();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (linkedinUrl.trim()) onSubmit(linkedinUrl.trim(), options, variant);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="linkedin-url">LinkedIn URL</Label>
        <Input
          id="linkedin-url"
          placeholder="https://www.linkedin.com/in/username"
          value={linkedinUrl}
          onChange={(e) => setLinkedinUrl(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">Data to Fetch</Label>
        <div className="flex flex-wrap gap-3">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={options.getWorkEmails} onCheckedChange={(v) => setOptions((prev) => ({ ...prev, getWorkEmails: v === true }))} />
            Work Emails ({costs.workEmail} credits)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={options.getPersonalEmails} onCheckedChange={(v) => setOptions((prev) => ({ ...prev, getPersonalEmails: v === true }))} />
            Personal Emails ({costs.personalEmail} credits)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={options.getPhoneNumbers} onCheckedChange={(v) => setOptions((prev) => ({ ...prev, getPhoneNumbers: v === true }))} />
            Phone Numbers ({costs.phone} credits)
          </label>
        </div>
      </div>

      <div className="space-y-2">
        <button
          type="button"
          className="text-xs text-muted-foreground hover:text-foreground underline"
          onClick={() => setShowAdvanced((v) => !v)}
        >
          {showAdvanced ? "Hide" : "Show"} advanced options
        </button>
        {showAdvanced && (
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Reveal Variant</Label>
            <select
              value={variant}
              onChange={(e) => setVariant(e.target.value as RevealVariant)}
              className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
            >
              {REVEAL_VARIANTS.map((v) => (
                <option key={v.id} value={v.id}>{v.label} — {v.description}</option>
              ))}
            </select>
            {variant === "exhaustive" && (
              <p className="text-xs text-amber-600">Exhaustive reveal runs asynchronously and may take longer.</p>
            )}
          </div>
        )}
      </div>

      <Button type="submit" disabled={!linkedinUrl.trim() || isLoading} className="w-full">
        {isLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Search className="mr-2 h-4 w-4" />
        )}
        Look Up Contact
      </Button>
    </form>
  );
}
