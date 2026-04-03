import { useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useCreditCosts } from "@/hooks/use-credit-costs";

interface EnrichmentFormProps {
  onSubmit: (linkedinUrl: string, options: EnrichmentOptions) => void;
  isLoading: boolean;
}

export interface EnrichmentOptions {
  getWorkEmails: boolean;
  getPersonalEmails: boolean;
  getPhoneNumbers: boolean;
}

export function EnrichmentForm({ onSubmit, isLoading }: EnrichmentFormProps) {
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [options, setOptions] = useState<EnrichmentOptions>({
    getWorkEmails: true,
    getPersonalEmails: false,
    getPhoneNumbers: false,
  });
  const costs = useCreditCosts();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (linkedinUrl.trim()) onSubmit(linkedinUrl.trim(), options);
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
