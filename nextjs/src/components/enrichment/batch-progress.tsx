import { CheckCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/shared/copy-button";

interface BatchStats {
  totalPeopleToFetch: number;
  numCompleted: number;
  numRemaining: number;
  numRejected: number;
  numDuplicates: number;
}

interface BatchResult {
  inputs: { linkedinUrl: { value: string }; [key: string]: unknown };
  outputs?: {
    emails: Array<{ email: string; type: string; status?: string | null; [key: string]: unknown }>;
    phoneNumbers: Array<{ number: string; type: string; [key: string]: unknown }>;
    [key: string]: unknown;
  } | null;
}

interface BatchProgressProps {
  stats: BatchStats | null;
  done: boolean;
  results: BatchResult[];
}

export function BatchProgress({ stats, done, results }: BatchProgressProps) {
  if (!stats) return null;

  const progress = stats.totalPeopleToFetch > 0
    ? Math.round((stats.numCompleted / stats.totalPeopleToFetch) * 100)
    : 0;

  return (
    <div className="space-y-4">
      {/* Progress Bar */}
      <Card>
        <CardContent className="pt-6 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">
              {done ? (
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  Complete
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </span>
              )}
            </span>
            <span className="text-muted-foreground">
              {stats.numCompleted} / {stats.totalPeopleToFetch}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span>Completed: {stats.numCompleted}</span>
            <span>Remaining: {stats.numRemaining}</span>
            {stats.numRejected > 0 && <span>Rejected: {stats.numRejected}</span>}
            {stats.numDuplicates > 0 && <span>Duplicates: {stats.numDuplicates}</span>}
          </div>
        </CardContent>
      </Card>

      {/* Results Table */}
      {results.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-2 text-left font-medium">LinkedIn URL</th>
                    <th className="px-3 py-2 text-left font-medium">Emails</th>
                    <th className="px-3 py-2 text-left font-medium">Phones</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r) => (
                    <tr key={r.inputs.linkedinUrl.value} className="border-b">
                      <td className="px-3 py-2 font-mono text-xs truncate max-w-[200px]">
                        {r.inputs.linkedinUrl.value}
                      </td>
                      <td className="px-3 py-2">
                        {r.outputs?.emails.length ? (
                          <div className="space-y-0.5">
                            {r.outputs.emails.map((e) => (
                              <div key={e.email} className="flex items-center gap-1">
                                <span className="text-xs font-mono">{e.email}</span>
                                <CopyButton value={e.email} />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {r.outputs?.phoneNumbers.length ? (
                          <div className="space-y-0.5">
                            {r.outputs.phoneNumbers.map((p) => (
                              <div key={p.number} className="flex items-center gap-1">
                                <span className="text-xs font-mono">{p.number}</span>
                                <CopyButton value={p.number} />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
