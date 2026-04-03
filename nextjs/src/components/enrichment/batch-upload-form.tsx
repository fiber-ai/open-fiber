import { useState, useRef } from "react";
import { Upload, FileText, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";

interface BatchUploadFormProps {
  onSubmit: (urls: string[], options: { getWorkEmails: boolean; getPersonalEmails: boolean; getPhoneNumbers: boolean }) => void;
  isLoading: boolean;
}

export function BatchUploadForm({ onSubmit, isLoading }: BatchUploadFormProps) {
  const [urls, setUrls] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [options, setOptions] = useState({
    getWorkEmails: true,
    getPersonalEmails: false,
    getPhoneNumbers: false,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParseError(null);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

      // Try to find LinkedIn URLs in each line
      const foundUrls: string[] = [];
      for (const line of lines) {
        // Split by comma for CSV
        const cells = line.split(",").map((c) => c.trim().replace(/^["']|["']$/g, ""));
        for (const cell of cells) {
          if (cell.includes("linkedin.com/in/") || cell.includes("linkedin.com/pub/")) {
            foundUrls.push(cell);
            break;
          }
        }
      }

      if (foundUrls.length === 0) {
        setParseError("No LinkedIn URLs found in the file. Ensure your CSV contains LinkedIn profile URLs.");
        setUrls([]);
      } else if (foundUrls.length > 10000) {
        setParseError("Maximum 10,000 profiles per batch. Your file has " + foundUrls.length + ".");
        setUrls([]);
      } else {
        setUrls(foundUrls);
      }
    };
    reader.readAsText(file);
  };

  const handleClear = () => {
    setUrls([]);
    setFileName(null);
    setParseError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div>
        <Label className="text-sm font-medium">Upload CSV</Label>
        <div
          className="mt-2 flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-8 hover:border-primary/50 hover:bg-muted/50 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Click to upload a CSV with LinkedIn URLs
          </p>
          <p className="text-xs text-muted-foreground">
            Up to 10,000 profiles per batch
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.txt"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Parse Result */}
      {parseError && (
        <p className="text-sm text-destructive">{parseError}</p>
      )}

      {fileName && urls.length > 0 && (
        <Card>
          <CardContent className="flex items-center justify-between pt-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{fileName}</span>
              <span className="text-sm text-muted-foreground">
                ({urls.length} LinkedIn URLs found)
              </span>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleClear}>
              <X className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Preview */}
      {urls.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs font-medium">Preview (first 5)</Label>
          <div className="rounded-md border bg-muted/50 p-3 text-xs font-mono space-y-1">
            {urls.slice(0, 5).map((url, i) => (
              <p key={i} className="truncate">{url}</p>
            ))}
            {urls.length > 5 && (
              <p className="text-muted-foreground">...and {urls.length - 5} more</p>
            )}
          </div>
        </div>
      )}

      {/* Options */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Data to Fetch</Label>
        <div className="flex flex-wrap gap-3">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={options.getWorkEmails} onCheckedChange={(v) => setOptions((p) => ({ ...p, getWorkEmails: v === true }))} />
            Work Emails
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={options.getPersonalEmails} onCheckedChange={(v) => setOptions((p) => ({ ...p, getPersonalEmails: v === true }))} />
            Personal Emails
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={options.getPhoneNumbers} onCheckedChange={(v) => setOptions((p) => ({ ...p, getPhoneNumbers: v === true }))} />
            Phone Numbers
          </label>
        </div>
      </div>

      <Button
        onClick={() => onSubmit(urls, options)}
        disabled={urls.length === 0 || isLoading}
        className="w-full"
      >
        {isLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Upload className="mr-2 h-4 w-4" />
        )}
        Start Batch Enrichment ({urls.length} profiles)
      </Button>
    </div>
  );
}
