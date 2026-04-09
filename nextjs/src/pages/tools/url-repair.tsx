import { useState } from "react";
import { z } from "zod";
import { Link2, Loader2, User, Building2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/shared/copy-button";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorDisplay } from "@/components/shared/error-display";
import { CsvImporter, type CsvColumnConfig, type CsvImporterResult } from "@/components/shared/csv-importer";

type Mode = "profile" | "company";
type InputMode = "paste" | "csv";

const urlRowSchema = z.object({
  identifier: z.string().min(1),
});

const CSV_COLUMNS: CsvColumnConfig[] = [
  { key: "identifier", label: "LinkedIn URL / URN", aliases: ["url", "linkedin", "urn", "slug", "linkedin_url"], required: true },
];

interface StandardizeResult {
  input: string;
  output: Record<string, unknown> | null;
  error?: string;
}

export default function UrlRepairPage() {
  const [mode, setMode] = useState<Mode>("profile");
  const [inputMode, setInputMode] = useState<InputMode>("paste");
  const [input, setInput] = useState("");
  const [results, setResults] = useState<StandardizeResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const standardizeProfile = trpc.linkedin.standardizeProfile.useMutation();
  const standardizeCompany = trpc.linkedin.standardizeCompany.useMutation();

  const processIdentifiers = async (identifiers: string[]) => {
    setIsProcessing(true);
    setResults([]);

    const newResults: StandardizeResult[] = [];

    for (const identifier of identifiers) {
      try {
        const mutate = mode === "profile" ? standardizeProfile : standardizeCompany;
        const data = await mutate.mutateAsync({ identifier });
        newResults.push({ input: identifier, output: data?.output ?? null });
      } catch (err) {
        newResults.push({ input: identifier, output: null, error: (err as Error).message });
      }
      setResults([...newResults]);
    }

    setIsProcessing(false);
  };

  const handleSubmit = () => {
    const identifiers = input.split("\n").map((s) => s.trim()).filter(Boolean);
    if (identifiers.length === 0) return;
    processIdentifiers(identifiers);
  };

  const handleCsvComplete = (result: CsvImporterResult<z.infer<typeof urlRowSchema>>) => {
    processIdentifiers(result.validRows.map((r) => r.identifier));
  };

  const successResults = results.filter((r) => r.output && !r.error);
  const errorResults = results.filter((r) => r.error);

  return (
    <div className="flex h-full flex-col">
      <Header title="URL Repair" description="Standardize LinkedIn URNs, Sales Navigator URLs, and slugs to canonical format" />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-3xl space-y-6">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex gap-2">
                <Button variant={mode === "profile" ? "default" : "outline"} size="sm" onClick={() => setMode("profile")}>
                  <User className="mr-1.5 h-4 w-4" /> Profile URLs
                </Button>
                <Button variant={mode === "company" ? "default" : "outline"} size="sm" onClick={() => setMode("company")}>
                  <Building2 className="mr-1.5 h-4 w-4" /> Company URLs
                </Button>
              </div>

              <div className="flex gap-2">
                <Button variant={inputMode === "paste" ? "default" : "outline"} size="sm" onClick={() => setInputMode("paste")}>
                  Paste
                </Button>
                <Button variant={inputMode === "csv" ? "default" : "outline"} size="sm" onClick={() => setInputMode("csv")}>
                  Upload CSV
                </Button>
              </div>

              {inputMode === "csv" && (
                <CsvImporter
                  schema={urlRowSchema}
                  columns={CSV_COLUMNS}
                  onComplete={handleCsvComplete}
                  confirmLabel="Standardize URLs"
                  isLoading={isProcessing}
                />
              )}

              {inputMode === "paste" && (
              <>
                <div className="space-y-2">
                  <Label>
                    {mode === "profile"
                      ? "LinkedIn Profile URNs, URLs, or slugs (one per line)"
                      : "LinkedIn Company slugs, org IDs, or URLs (one per line)"}
                  </Label>
                  <Textarea
                    className="min-h-[120px] font-mono text-xs"
                    placeholder={
                      mode === "profile"
                        ? "ACoAADVMtbkBbZIxJxJjGEQV7SrQCMml8ni7qyg\nhttps://www.linkedin.com/in/ACoAADVMtbkB...\njohn-doe-12345"
                        : "microsoft\n1035\nhttps://www.linkedin.com/company/microsoft"
                    }
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Converts Sales Navigator entity URNs (ACo/ACw) and other identifiers to standard LinkedIn URLs.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <Button onClick={handleSubmit} disabled={!input.trim() || isProcessing}>
                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Link2 className="mr-2 h-4 w-4" />}
                    Standardize {input.split("\n").filter((s) => s.trim()).length || ""} URLs
                  </Button>
                  {isProcessing && results.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {results.length} / {input.split("\n").filter((s) => s.trim()).length} processed
                    </span>
                  )}
                </div>
              </>
              )}
            </CardContent>
          </Card>

          {/* Results */}
          {results.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  Results
                  {successResults.length > 0 && <Badge variant="secondary">{successResults.length} resolved</Badge>}
                  {errorResults.length > 0 && <Badge variant="destructive">{errorResults.length} failed</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-4 py-2 text-left font-medium">Input</th>
                        <th className="px-4 py-2 text-left font-medium">Standardized URL</th>
                        <th className="px-4 py-2 text-left font-medium w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((r, i) => {
                        const standardizedUrl =
                          (r.output?.linkedinUrl as string) ??
                          (r.output?.url as string) ??
                          (r.output?.standardizedUrl as string) ??
                          (r.output?.slug ? `https://www.linkedin.com/${mode === "profile" ? "in" : "company"}/${r.output.slug}` : null);

                        return (
                          <tr key={i} className="border-b">
                            <td className="px-4 py-2 font-mono text-xs truncate max-w-[200px]">{r.input}</td>
                            <td className="px-4 py-2">
                              {r.error ? (
                                <span className="text-xs text-destructive">{r.error}</span>
                              ) : standardizedUrl ? (
                                <a href={standardizedUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline font-mono">
                                  {standardizedUrl}
                                </a>
                              ) : (
                                <pre className="text-xs text-muted-foreground">{JSON.stringify(r.output, null, 1)}</pre>
                              )}
                            </td>
                            <td className="px-4 py-2">
                              {standardizedUrl && <CopyButton value={standardizedUrl} />}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {results.length === 0 && !isProcessing && (
            <EmptyState icon={Link2} title="URL Repair" description="Paste LinkedIn URNs or Sales Navigator URLs to convert them to standard format." />
          )}
        </div>
      </div>
    </div>
  );
}
