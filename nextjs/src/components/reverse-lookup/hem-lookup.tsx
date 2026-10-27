import { useMemo, useState, useId } from "react";
import { Hash, Loader2, Search, ExternalLink, Download, Lock } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ErrorDisplay } from "@/components/shared/error-display";
import { CopyButton } from "@/components/shared/copy-button";
import { ToggleButtonGroup } from "@/components/shared/toggle-button-group";
import { cn } from "@/lib/utils";

type Algo = "SHA-256" | "SHA-1";
const HEX = /^[a-f0-9]{32}$|^[a-f0-9]{40}$|^[a-f0-9]{64}$/i;
const MAX = 100;

/** Hash in the browser so raw emails never leave the page — only the digest is sent. */
async function digest(email: string, algo: Algo) {
  const buf = await crypto.subtle.digest(algo, new TextEncoder().encode(email.trim().toLowerCase()));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const algoOf = (h: string) => (h.length === 64 ? "SHA-256" : h.length === 40 ? "SHA-1" : h.length === 32 ? "MD5" : "?");

interface Result { status: "found" | "not_found" | "rejected"; hashedEmail: string; originalEmail?: string; linkedinUrl?: string | null; linkedinUserID?: string | null; message?: string }

export function HemLookup() {
  const uid = useId();
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<"hashes" | "emails">("hashes");
  const [algo, setAlgo] = useState<Algo>("SHA-256");
  const [sourceByHash, setSourceByHash] = useState<Record<string, string>>({});
  const m = trpc.reverseLookup.hashed.useMutation();

  const lines = useMemo(() => Array.from(new Set(input.split(/[\s,;]+/).map((l) => l.trim()).filter(Boolean))), [input]);
  const invalid = mode === "hashes" ? lines.filter((l) => !HEX.test(l)) : lines.filter((l) => !l.includes("@"));

  const run = async () => {
    let hashes = lines;
    const map: Record<string, string> = {};
    if (mode === "emails") {
      hashes = await Promise.all(lines.map(async (e) => { const h = await digest(e, algo); map[h] = e; return h; }));
    }
    setSourceByHash(map);
    m.mutate({ hashedEmails: hashes.slice(0, MAX) });
  };

  const results = (m.data?.output.data ?? []) as Result[];
  const counts = { found: 0, not_found: 0, rejected: 0 };
  results.forEach((r) => counts[r.status]++);

  const downloadCsv = () => {
    const rows = [["hashedEmail", "status", "originalEmail", "linkedinUrl", "linkedinUserID", "message"], ...results.map((r) => [r.hashedEmail, r.status, r.originalEmail ?? "", r.linkedinUrl ?? "", r.linkedinUserID ?? "", r.message ?? ""])];
    const csv = rows.map((r) => r.map((c) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url; a.download = "hem-lookup.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-medium">I have</Label>
          <ToggleButtonGroup<"hashes" | "emails"> value={mode} onChange={setMode} options={[{ value: "hashes", label: "Hashed emails" }, { value: "emails", label: "Plain emails" }]} />
        </div>
        {mode === "emails" && (
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium">Hash with</Label>
            <ToggleButtonGroup<Algo> value={algo} onChange={setAlgo} options={[{ value: "SHA-256", label: "SHA-256" }, { value: "SHA-1", label: "SHA-1" }]} />
          </div>
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${uid}-entries`} className="text-xs font-medium">{mode === "hashes" ? "SHA-256, SHA-1 or MD5 digests" : "Email addresses"} — one per line, up to {MAX}</Label>
        <Textarea id={`${uid}-entries`}
          rows={7}
          className="font-mono text-xs"
          placeholder={mode === "hashes" ? "b4c9a289323b21a01c3e940f150eb9b8c542587f1abfd8f0e1cc1ffc5e475514" : "jane@acme.com\nraj@example.org"}
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span>{lines.length} unique{lines.length > MAX && <span className="text-warning"> · only the first {MAX} will be sent</span>}</span>
          {invalid.length > 0 && <span className="text-warning">{invalid.length} don&apos;t look like {mode === "hashes" ? "hex digests" : "emails"}{mode === "hashes" && " (they'll come back as rejected)"}</span>}
          {mode === "emails" && <span className="flex items-center gap-1"><Lock className="h-3 w-3" />Hashed in your browser. Plain emails are never sent.</span>}
        </div>
      </div>
      <Button onClick={() => run().catch(() => {})} disabled={m.isPending || lines.length === 0}>
        {m.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}Resolve {Math.min(lines.length, MAX) || ""} · 2 cr per match
      </Button>

      {m.isError && <ErrorDisplay message={m.error.message} />}
      {results.length > 0 && (
        <>
          <Card>
            <CardContent className="flex flex-wrap items-center gap-6 pt-5">
              <div className="flex-1 min-w-[16rem]">
                <div className="flex h-3 overflow-hidden rounded-full bg-muted">
                  <div className="bg-success" style={{ width: `${(counts.found / results.length) * 100}%` }} />
                  <div className="bg-muted-foreground/30" style={{ width: `${(counts.not_found / results.length) * 100}%` }} />
                  <div className="bg-destructive" style={{ width: `${(counts.rejected / results.length) * 100}%` }} />
                </div>
                <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-success" />{counts.found} found</span>
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-muted-foreground/30" />{counts.not_found} not found</span>
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-destructive" />{counts.rejected} rejected</span>
                </div>
              </div>
              <p className="text-2xl font-semibold tabular-nums">{Math.round((counts.found / results.length) * 100)}%<span className="ml-1 text-sm font-normal text-muted-foreground">match rate</span></p>
              <Button variant="outline" size="sm" onClick={downloadCsv}><Download className="mr-1.5 h-3.5 w-3.5" />CSV</Button>
            </CardContent>
          </Card>
          <div className="overflow-hidden rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs text-muted-foreground">
                <tr><th className="px-3 py-2 text-left font-medium">Hash</th><th className="px-3 py-2 text-left font-medium">Status</th><th className="px-3 py-2 text-left font-medium">Email</th><th className="px-3 py-2 text-left font-medium">LinkedIn</th></tr>
              </thead>
              <tbody className="divide-y">
                {results.map((r) => (
                  <tr key={r.hashedEmail}>
                    <td className="px-3 py-2">
                      <span className="flex items-center gap-1.5">
                        <Badge variant="outline" className="h-4 px-1 text-[10px] font-normal">{algoOf(r.hashedEmail)}</Badge>
                        <span className="font-mono text-xs text-muted-foreground" title={r.hashedEmail}>{r.hashedEmail.slice(0, 12)}…</span>
                        {sourceByHash[r.hashedEmail] && <span className="text-xs">({sourceByHash[r.hashedEmail]})</span>}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant="outline" className={cn("text-[10px]", r.status === "found" && "border-success/50 text-success", r.status === "rejected" && "border-destructive/50 text-destructive")}>{r.status.replace("_", " ")}</Badge>
                    </td>
                    <td className="px-3 py-2">
                      {r.originalEmail ? <span className="flex items-center gap-1 font-mono text-xs">{r.originalEmail}<CopyButton value={r.originalEmail} /></span> : <span className="text-xs text-muted-foreground">{r.message ?? "—"}</span>}
                    </td>
                    <td className="px-3 py-2">
                      {r.linkedinUrl ? <a href={r.linkedinUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline"><ExternalLink className="h-3 w-3" />{r.linkedinUrl.replace(/^https?:\/\/(www\.)?linkedin\.com/, "")}</a> : <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {!m.data && !m.isPending && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground"><Hash className="h-3.5 w-3.5" />Hashes must be of the lowercased, trimmed address. Results come back in the same order you sent them.</p>
      )}
    </div>
  );
}
