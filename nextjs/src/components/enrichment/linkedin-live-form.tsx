import { useState } from "react";
import { Globe, Loader2, User, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreditCosts } from "@/hooks/use-credit-costs";

type LookupType = "profile" | "company";

interface LinkedInLiveFormProps {
  onProfileLookup: (identifier: string) => void;
  onCompanyLookup: (value: string) => void;
  isLoading: boolean;
}

export function LinkedInLiveForm({
  onProfileLookup,
  onCompanyLookup,
  isLoading,
}: LinkedInLiveFormProps) {
  const [lookupType, setLookupType] = useState<LookupType>("profile");
  const [identifier, setIdentifier] = useState("");
  const costs = useCreditCosts();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = identifier.trim();
    if (!value) return;
    if (lookupType === "profile") {
      onProfileLookup(value);
    } else {
      onCompanyLookup(value);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex gap-2">
        <Button
          type="button"
          variant={lookupType === "profile" ? "default" : "outline"}
          size="sm"
          onClick={() => setLookupType("profile")}
        >
          <User className="mr-1.5 h-4 w-4" />
          Profile
        </Button>
        <Button
          type="button"
          variant={lookupType === "company" ? "default" : "outline"}
          size="sm"
          onClick={() => setLookupType("company")}
        >
          <Building2 className="mr-1.5 h-4 w-4" />
          Company
        </Button>
      </div>

      <div className="space-y-2">
        <Label>
          {lookupType === "profile" ? "LinkedIn Profile URL or Slug" : "LinkedIn Company URL or Slug"}
        </Label>
        <Input
          placeholder={
            lookupType === "profile"
              ? "https://www.linkedin.com/in/username or username"
              : "https://www.linkedin.com/company/name or name"
          }
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
        />
      </div>

      <Button type="submit" disabled={!identifier.trim() || isLoading} className="w-full">
        {isLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Globe className="mr-2 h-4 w-4" />
        )}
        Fetch Live Data ({lookupType === "profile" ? costs.liveEnrichPerson : costs.liveEnrichCompany} credits)
      </Button>
    </form>
  );
}
