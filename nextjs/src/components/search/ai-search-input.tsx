import { useState } from "react";
import { Sparkles, Loader2, Building2, UserSearch, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface AISearchInputProps {
  onSearchCompanies: (query: string) => void;
  onSearchProspects: (query: string) => void;
  onSearchJD?: (query: string) => void;
  isLoading: boolean;
}

export function AISearchInput({
  onSearchCompanies,
  onSearchProspects,
  onSearchJD,
  isLoading,
}: AISearchInputProps) {
  const [query, setQuery] = useState("");

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-sm font-medium">
          Describe what you&apos;re looking for
        </Label>
        <Textarea
          className="min-h-[120px]"
          placeholder={"e.g. Series A SaaS companies in the US with 50-200 employees that use React\n\nor: VP of Engineering at AI startups in San Francisco who went to Stanford"}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Fiber AI will automatically generate the right search filters from your description.
        </p>
      </div>
      <div className="flex gap-2">
        <Button
          onClick={() => onSearchCompanies(query)}
          disabled={!query.trim() || isLoading}
          className="flex-1"
        >
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Building2 className="mr-2 h-4 w-4" />
          )}
          Search Companies
        </Button>
        <Button
          onClick={() => onSearchProspects(query)}
          disabled={!query.trim() || isLoading}
          variant="outline"
          className="flex-1"
        >
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <UserSearch className="mr-2 h-4 w-4" />
          )}
          Search Prospects
        </Button>
        {onSearchJD && (
          <Button
            onClick={() => onSearchJD(query)}
            disabled={!query.trim() || isLoading}
            variant="outline"
            className="flex-1"
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileText className="mr-2 h-4 w-4" />
            )}
            JD → People
          </Button>
        )}
      </div>
    </div>
  );
}
