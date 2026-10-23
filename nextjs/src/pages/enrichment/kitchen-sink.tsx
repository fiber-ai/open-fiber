import { useMemo, useState } from "react";
import { CookingPot, Loader2, Search, Rows3, User, CheckCircle2, XCircle, Download } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorDisplay } from "@/components/shared/error-display";
import { ToggleButtonGroup } from "@/components/shared/toggle-button-group";
import { PersonProfileCard } from "@/components/shared/profile-cards";
import { cn } from "@/lib/utils";

type Row = Record<string, unknown>;
type Tab = "single" | "bulk";
interface Opts { liveFetch: boolean; forceCompanyMatch: boolean; fuzzySearch: boolean; thoroughness: "low" | "high"; getDetailedEducation: boolean; getDetailedWorkExperience: boolean }

const DEFAULT_OPTS: Opts = { liveFetch: false, forceCompanyMatch: false, fuzzySearch: false, thoroughness: "low", getDetailedEducation: false, getDetailedWorkExperience: false };
const BULK_MAX = 50;

/** Rough guide to match quality: strong identifiers count more than soft hints. */
const WEIGHTS: Record<string, number> = { linkedin: 5, email: 4, name: 2, companyDomain: 2, companyLinkedin: 2, companyName: 1, title: 1, headline: 1, location: 1, school: 1 };

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <label className="flex flex-col gap-1.5"><span className="text-xs font-medium leading-none">{label}</span>{children}{hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}</label>;
}

function OptionsRow({ opts, setOpts, bulk }: { opts: Opts; setOpts: (o: Opts) => void; bulk?: boolean }) {
  const toggle = (k: keyof Opts, label: string, hint: string) => (
    <label className="flex items-start gap-2 text-sm" title={hint}>
      <Checkbox className="mt-0.5" checked={opts[k] as boolean} onCheckedChange={(v) => setOpts({ ...opts, [k]: v === true })} />
      <span>{label}<span className="block text-[11px] text-muted-foreground">{hint}</span></span>
    </label>
  );
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {toggle("liveFetch", "Live fetch (+2 cr)", "Fetch fresh from LinkedIn for profiles not yet in the database")}
      {toggle("forceCompanyMatch", "Must work at the company", "Only return people currently at the company you gave")}
      {toggle("fuzzySearch", "Fuzzy search", "Tolerate typos and variations in the inputs")}
      {toggle("getDetailedWorkExperience", "Detailed work history", "Return full experience entries")}
      {toggle("getDetailedEducation", "Detailed education", "Return full education entries")}
      <div className="flex items-center gap-2 text-sm">
        <span>Thoroughness</span>
        <ToggleButtonGroup<"low" | "high"> value={opts.thoroughness} onChange={(t) => setOpts({ ...opts, thoroughness: t })} options={[{ value: "low", label: "Fast" }, { value: "high", label: "Thorough" }]} />
      </div>
      {bulk && <p className="text-[11px] text-muted-foreground sm:col-span-2 lg:col-span-3">Options apply to every row. 2 credits per person (+2 with live fetch).</p>}
    </div>
  );
}

function SingleMatch() {
  const [f, setF] = useState({ linkedin: "", email: "", name: "", looseName: true, title: "", headline: "", companyName: "", companyDomain: "", companyLinkedin: "", country: "", state: "", locality: "", school: "", num: 1 });
  const [opts, setOpts] = useState<Opts>(DEFAULT_OPTS);
  const m = trpc.kitchenSink.person.useMutation();
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  const strength = useMemo(() => {
    const has: Record<string, boolean> = {
      linkedin: !!f.linkedin.trim(), email: !!f.email.trim(), name: !!f.name.trim(), companyDomain: !!f.companyDomain.trim(), companyLinkedin: !!f.companyLinkedin.trim(),
      companyName: !!f.companyName.trim(), title: !!f.title.trim(), headline: !!f.headline.trim(), location: !!(f.country || f.state || f.locality).trim(), school: !!f.school.trim(),
    };
    const score = Object.entries(has).reduce((n, [k, v]) => n + (v ? WEIGHTS[k] : 0), 0);
    return { score: Math.min(score, 8), any: Object.values(has).some(Boolean) };
  }, [f]);

  const submit = () => {
    const v = (s: string) => (s.trim() ? { value: s.trim() } : undefined);
    const li = f.linkedin.trim();
    const cli = f.companyLinkedin.trim();
    m.mutate({
      profileIdentifier: li ? { identifier: li.includes("linkedin.com") ? "linkedinUrl" : "linkedinSlug", value: li } : undefined,
      emailAddress: f.email.trim() || undefined,
      personName: f.name.trim() ? { value: f.name.trim(), looseMatch: f.looseName } : undefined,
      jobTitle: v(f.title),
      linkedinHeadline: f.headline.trim() ? { value: f.headline.trim(), looseMatch: true } : undefined,
      companyName: v(f.companyName),
      companyDomain: v(f.companyDomain),
      companyIdentifier: cli ? { identifier: cli.includes("linkedin.com") ? "linkedinUrl" : /^\d+$/.test(cli) ? "linkedinOrgID" : "linkedinSlug", value: cli } : undefined,
      profileLocation: f.country || f.state || f.locality ? { countryCode: f.country.trim() || undefined, stateName: f.state.trim() || undefined, locality: f.locality.trim() || undefined } : undefined,
      schoolName: v(f.school),
      numProfiles: f.num,
      ...opts,
    });
  };

  const matches = ((m.data?.output.data ?? []) as Row[]);
  const labels = ["Not enough to match", "Weak", "Weak", "Fair", "Fair", "Good", "Good", "Strong", "Strong"];

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-5 pt-5">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Who</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="LinkedIn URL or slug" hint="Best accuracy"><Input value={f.linkedin} onChange={set("linkedin")} placeholder="linkedin.com/in/janedoe" /></Field>
              <Field label="Email" hint="Second-best accuracy"><Input value={f.email} onChange={set("email")} placeholder="jane@acme.com" /></Field>
              <Field label="Full name">
                <Input value={f.name} onChange={set("name")} placeholder="Jane Doe" />
                <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><Checkbox checked={f.looseName} onCheckedChange={(c) => setF({ ...f, looseName: c === true })} />Allow partial / out-of-order matches</label>
              </Field>
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Where they work</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Company domain"><Input value={f.companyDomain} onChange={set("companyDomain")} placeholder="acme.com" /></Field>
              <Field label="Company name"><Input value={f.companyName} onChange={set("companyName")} placeholder="Acme" /></Field>
              <Field label="Company LinkedIn (URL, slug or org ID)"><Input value={f.companyLinkedin} onChange={set("companyLinkedin")} placeholder="linkedin.com/company/acme" /></Field>
              <Field label="Job title"><Input value={f.title} onChange={set("title")} placeholder="VP Sales" /></Field>
              <Field label="LinkedIn headline (loose match)"><Input value={f.headline} onChange={set("headline")} placeholder="Building GTM at Acme" /></Field>
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Other hints</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <Field label="Country (ISO-3)"><Input value={f.country} onChange={set("country")} placeholder="USA" /></Field>
              <Field label="State"><Input value={f.state} onChange={set("state")} placeholder="California" /></Field>
              <Field label="City / locality"><Input value={f.locality} onChange={set("locality")} placeholder="San Francisco" /></Field>
              <Field label="School"><Input value={f.school} onChange={set("school")} placeholder="Stanford University" /></Field>
              <Field label="Max matches"><Input type="number" min={1} max={10} value={f.num} onChange={(e) => setF({ ...f, num: Math.min(10, Math.max(1, Number(e.target.value) || 1)) })} /></Field>
            </div>
          </div>
          <OptionsRow opts={opts} setOpts={setOpts} />
          <div className="flex flex-wrap items-center gap-4">
            <Button onClick={submit} disabled={!strength.any || m.isPending}>{m.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}Find match</Button>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              Match signal
              <span className="flex gap-0.5">{Array.from({ length: 8 }).map((_, i) => <span key={i} className={cn("h-2 w-3 rounded-sm", i < strength.score ? (strength.score >= 5 ? "bg-success" : strength.score >= 3 ? "bg-warning" : "bg-destructive") : "bg-muted")} />)}</span>
              <span>{labels[strength.score]}</span>
            </div>
          </div>
        </CardContent>
      </Card>
      {m.isError && <ErrorDisplay message={m.error.message} />}
      {m.isSuccess && matches.length === 0 && <EmptyState icon={User} title="No match" description="Add more signals (company domain + name is a good pair) or turn on fuzzy search or live fetch." />}
      {matches.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{matches.length === 1 ? "1 match" : `${matches.length} candidates, best first`}</p>
          <div className="grid gap-4 lg:grid-cols-2">{matches.map((p, i) => <PersonProfileCard key={i} p={p} />)}</div>
        </div>
      )}
    </div>
  );
}

/** Splits a CSV/TSV line, honouring quotes. */
function splitLine(line: string, sep: string) {
  const out: string[] = []; let cur = "", q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) { if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
    else if (c === '"') q = true; else if (c === sep) { out.push(cur); cur = ""; } else cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

const COLS: { key: string; label: string; match: RegExp }[] = [
  { key: "name", label: "Name", match: /^(full.?)?name$|^person/i },
  { key: "title", label: "Title", match: /title|role|position/i },
  { key: "company", label: "Company", match: /^company(.?name)?$|^employer|^organi[sz]ation$/i },
  { key: "domain", label: "Domain", match: /domain|website/i },
  { key: "linkedin", label: "LinkedIn", match: /linkedin|profile.?url/i },
  { key: "email", label: "Email", match: /e-?mail/i },
];

function BulkMatch() {
  const [text, setText] = useState("");
  const [opts, setOpts] = useState<Opts>(DEFAULT_OPTS);
  const m = trpc.kitchenSink.bulkPeople.useMutation();

  const parsed = useMemo(() => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) return null;
    const sep = lines[0].includes("\t") ? "\t" : ",";
    const header = splitLine(lines[0], sep);
    const map: Record<string, number> = {};
    COLS.forEach((c) => { const i = header.findIndex((h) => c.match.test(h)); if (i >= 0 && !Object.values(map).includes(i)) map[c.key] = i; });
    const rows = lines.slice(1).map((l) => splitLine(l, sep));
    return { header, map, rows };
  }, [text]);

  const run = () => {
    if (!parsed) return;
    const get = (r: string[], k: string) => (parsed.map[k] != null ? r[parsed.map[k]]?.trim() || "" : "");
    const profiles = parsed.rows.slice(0, BULK_MAX).map((r) => {
      const li = get(r, "linkedin"), email = get(r, "email");
      return {
        profileIdentifier: li ? { identifier: (li.includes("linkedin.com") ? "linkedinUrl" : "linkedinSlug") as "linkedinUrl" | "linkedinSlug", value: li } : undefined,
        emailAddress: /\S+@\S+/.test(email) ? email : undefined,
        personName: get(r, "name") ? { value: get(r, "name"), looseMatch: true } : undefined,
        jobTitle: get(r, "title") ? { value: get(r, "title") } : undefined,
        companyName: get(r, "company") ? { value: get(r, "company") } : undefined,
        companyDomain: get(r, "domain") ? { value: get(r, "domain").replace(/^https?:\/\//, "").replace(/\/.*$/, "") } : undefined,
      };
    });
    m.mutate({ profiles, ...opts });
  };

  const results = (m.data?.output.data ?? []) as Row[][];
  const matched = results.filter((r) => r.length > 0).length;
  const sent = parsed?.rows.slice(0, BULK_MAX) ?? [];

  const downloadCsv = () => {
    if (!parsed) return;
    const head = [...parsed.header, "match_name", "match_headline", "match_linkedin"];
    const lines = sent.map((r, i) => {
      const p = results[i]?.[0];
      const url = p ? ((p.url as string) ?? (p.primary_slug ? `https://www.linkedin.com/in/${p.primary_slug}` : "")) : "";
      return [...r, (p?.name as string) ?? "", (p?.headline as string) ?? "", url];
    });
    const csv = [head, ...lines].map((r) => r.map((c) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = "kitchen-sink-matches.csv"; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-4 pt-5">
          <Field label={`Paste CSV or TSV with a header row (up to ${BULK_MAX} people)`} hint="Columns are detected by name: name, title, company, domain, LinkedIn, email. Use whatever you have.">
            <Textarea rows={7} className="font-mono text-xs" placeholder={"name,company,domain,title\nJane Doe,Acme,acme.com,VP Sales\nRaj Kumar,Globex,globex.com,CTO"} value={text} onChange={(e) => setText(e.target.value)} />
          </Field>
          {parsed && (
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-muted-foreground">Detected:</span>
              {COLS.map((c) => <Badge key={c.key} variant={parsed.map[c.key] != null ? "secondary" : "outline"} className={cn("font-normal", parsed.map[c.key] == null && "opacity-50")}>{c.label}{parsed.map[c.key] != null && ` ← ${parsed.header[parsed.map[c.key]]}`}</Badge>)}
              <span className="ml-2 text-muted-foreground">{parsed.rows.length} rows{parsed.rows.length > BULK_MAX && ` · only the first ${BULK_MAX} will run`}</span>
            </div>
          )}
          <OptionsRow opts={opts} setOpts={setOpts} bulk />
          <Button onClick={run} disabled={!parsed || Object.keys(parsed.map).length === 0 || m.isPending}>
            {m.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Rows3 className="mr-2 h-4 w-4" />}Match {sent.length || ""} people
          </Button>
          {m.isPending && <p className="text-xs text-muted-foreground">Bulk matching can take a couple of minutes.</p>}
        </CardContent>
      </Card>
      {m.isError && <ErrorDisplay message={m.error.message} />}
      {results.length > 0 && parsed && (
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm">{matched} of {results.length} matched</CardTitle>
            <Button size="sm" variant="outline" onClick={downloadCsv}><Download className="mr-1.5 h-3.5 w-3.5" />CSV with matches</Button>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground"><tr><th className="w-6" /><th className="py-1.5 text-left font-medium">Input</th><th className="py-1.5 text-left font-medium">Match</th></tr></thead>
              <tbody className="divide-y">
                {sent.map((r, i) => {
                  const p = results[i]?.[0];
                  const url = p ? ((p.url as string) ?? (p.primary_slug ? `https://www.linkedin.com/in/${p.primary_slug}` : null)) : null;
                  return (
                    <tr key={i}>
                      <td className="py-2">{p ? <CheckCircle2 className="h-4 w-4 text-success" /> : <XCircle className="h-4 w-4 text-muted-foreground" />}</td>
                      <td className="py-2 pr-4 text-xs text-muted-foreground">{r.filter(Boolean).join(" · ")}</td>
                      <td className="py-2">
                        {p ? (
                          <span className="flex items-center gap-2">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            {typeof p.profile_pic === "string" && <img src={p.profile_pic} alt="" className="h-6 w-6 rounded-full object-cover" />}
                            <span>
                              {url ? <a href={url} target="_blank" rel="noreferrer" className="font-medium hover:underline">{p.name as string}</a> : <span className="font-medium">{p.name as string}</span>}
                              <span className="block text-xs text-muted-foreground">{p.headline as string}</span>
                            </span>
                            {results[i].length > 1 && <Badge variant="outline" className="text-[10px]">+{results[i].length - 1} more</Badge>}
                          </span>
                        ) : <span className="text-xs text-muted-foreground">no match</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function KitchenSinkPage() {
  const [tab, setTab] = useState<Tab>("single");
  return (
    <div className="flex h-full flex-col">
      <Header icon={CookingPot} title="Kitchen Sink" description="Find a person from whatever you know: name, company, title, email, location, school">
        <ToggleButtonGroup<Tab> value={tab} onChange={setTab} options={[{ value: "single", label: "One person", icon: User }, { value: "bulk", label: "Bulk (CSV)", icon: Rows3 }]} />
      </Header>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-5xl">{tab === "single" ? <SingleMatch /> : <BulkMatch />}</div>
      </div>
    </div>
  );
}
