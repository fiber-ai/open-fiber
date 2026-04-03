import { useState } from "react";
import { Eye, EyeOff, Key, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ApiKeyInputProps {
  onSubmit: (apiKey: string) => void;
  isLoading?: boolean;
  error?: string;
}

export function ApiKeyInput({ onSubmit, isLoading, error }: ApiKeyInputProps) {
  const [apiKey, setApiKey] = useState("");
  const [visible, setVisible] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = apiKey.trim();
    if (trimmed) onSubmit(trimmed);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="api-key">Fiber API Key</Label>
        <div className="relative">
          <Input
            id="api-key"
            type={visible ? "text" : "password"}
            placeholder="Enter your Fiber API key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setVisible(!visible)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          Get your API key at{" "}
          <a
            href="https://fiber.ai/app/api"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground"
          >
            fiber.ai/app/api
          </a>
        </p>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
      <Button type="submit" disabled={!apiKey.trim() || isLoading} className="w-full">
        {isLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Key className="mr-2 h-4 w-4" />
        )}
        Connect to Fiber
      </Button>
    </form>
  );
}
