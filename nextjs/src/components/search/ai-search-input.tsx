import { useState } from "react";
import { Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface AISearchInputProps {
  onSearch: (query: string) => void;
  isLoading: boolean;
}

export function AISearchInput({ onSearch, isLoading }: AISearchInputProps) {
  const [query, setQuery] = useState("");

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-sm font-medium">
          Describe what you&apos;re looking for
        </Label>
        <Textarea
          className="min-h-[120px]"
          placeholder={"e.g. Series A SaaS companies in the US with 50-200 employees that use React\nor: VP of Engineering at AI startups in San Francisco who went to Stanford"}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Fiber AI figures out whether you&apos;re looking for companies or people and returns the right results.
        </p>
      </div>
      <Button
        onClick={() => onSearch(query)}
        disabled={!query.trim() || isLoading}
        className="w-full"
      >
        {isLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Search className="mr-2 h-4 w-4" />
        )}
        Search
      </Button>
    </div>
  );
}
