import { useState } from "react";
import { Sparkles, Loader2, Building2, FileText, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface AISearchInputProps {
  onSearch: (query: string) => void;
  onSearchCompanies: (query: string) => void;
  onSearchJD?: (query: string) => void;
  isLoading: boolean;
}

export function AISearchInput({
  onSearch,
  onSearchCompanies,
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
          placeholder={"e.g. Senior backend engineers at Series B fintech startups in the US with 100-500 employees\nor: VP of Engineering at AI startups in San Francisco who went to Stanford"}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Fiber AI will automatically generate the right search filters from your description.
        </p>
      </div>
      <div className="flex gap-2">
        <Button
          onClick={() => onSearch(query)}
          disabled={!query.trim() || isLoading}
          className="flex-1"
        >
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Search className="mr-2 h-4 w-4" />
          )}
          Search
        </Button>
        <Button
          onClick={() => onSearchCompanies(query)}
          disabled={!query.trim() || isLoading}
          variant="outline"
          className="flex-1"
        >
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Building2 className="mr-2 h-4 w-4" />
          )}
          Companies Only
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
            JD &rarr; People
          </Button>
        )}
      </div>
    </div>
  );
}
