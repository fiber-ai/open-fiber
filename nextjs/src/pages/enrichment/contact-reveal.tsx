import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Contact, Loader2, Mail, Phone, Zap, Gauge, Layers, CheckCircle2, AlertTriangle, XCircle, HelpCircle, ShieldCheck } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyButton } from "@/components/shared/copy-button";
import { ToggleButtonGroup } from "@/components/shared/toggle-button-group";
import { PATIENCE_LEVELS, type Patience } from "@/lib/schemas/enrichment";
import { cn } from "@/lib/utils";

type InputMode = "linkedin" | "name-domain";
interface Want { getWorkEmails: boolean; getPersonalEmails: boolean; getPhoneNumbers: boolean }
type StackId = "instant" | "lite" | "standard" | "turbo" | "exhaustive" | "premiumPhone" | "basicWorkEmail";

interface StackDef {
  id: StackId;
  label: string;
  blurb: string;
  speed: 1 | 2 | 3; // 3 = fastest
  coverage: 1 | 2 | 3;
  modes: InputMode[];
  /** Upper-bound credits for the requested data, from the API's published pricing. */
  cost: (w: Want) => number | null;
}

// Tiered "pay for what you request" pricing: [work only, personal only, all emails, phone only, everything]
const tiered = (t: [number, number, number, number, number]) => (w: Want) => {
  const emails = w.getWorkEmails && w.getPersonalEmails ? t[2] : w.getWorkEmails ? t[0] : w.getPersonalEmails ? t[1] : 0;
  if (w.getPhoneNumbers) return emails ? t[4] : t[3];
  return emails || null;
};

const STACKS: StackDef[] = [
  { id: "instant", label: "Instant", blurb: "Only what's already on file. No live discovery.", speed: 3, coverage: 1, modes: ["linkedin", "name-domain"], cost: (w) => ((w.getWorkEmails || w.getPersonalEmails ? 1 : 0) + (w.getPhoneNumbers ? 1 : 0)) || null },
  { id: "lite", label: "Lite", blurb: "Cheapest live search. May miss contacts others find.", speed: 3, coverage: 1, modes: ["linkedin", "name-domain"], cost: (w) => ((w.getWorkEmails || w.getPersonalEmails ? 1 : 0) + (w.getPhoneNumbers ? 2 : 0)) || null },
  { id: "standard", label: "Standard", blurb: "Best balance of speed, cost and coverage.", speed: 2, coverage: 2, modes: ["linkedin"], cost: tiered([2, 2, 3, 3, 5]) },
  { id: "turbo", label: "Turbo", blurb: "Premium stack, lowest latency, higher cost.", speed: 3, coverage: 2, modes: ["linkedin"], cost: tiered([3, 3, 5, 5, 7]) },
  { id: "exhaustive", label: "Exhaustive", blurb: "Every source in parallel. Takes 2–3 minutes.", speed: 1, coverage: 3, modes: ["linkedin"], cost: tiered([5, 5, 9, 4, 12]) },
  { id: "premiumPhone", label: "Premium phone", blurb: "Phones only, checked against caller ID.", speed: 2, coverage: 3, modes: ["linkedin"], cost: (w) => (w.getPhoneNumbers ? 5 : null) },
  { id: "basicWorkEmail", label: "Basic work email", blurb: "Work email from name + company. No LinkedIn needed.", speed: 3, coverage: 1, modes: ["name-domain"], cost: (w) => (w.getWorkEmails ? 1 : null) },
];

interface FoundEmail { address: string; type?: string | null; status?: string | null; score?: number | null; catchAll?: boolean | null; unmatched?: boolean }
interface FoundPhone { number: string; type?: string | null; callerId?: { category: string; reasoning: string; callerIdName: string } | null }
interface StackResultT { emails: FoundEmail[]; phones: FoundPhone[] }

type Row = Record<string, unknown>;
/** Each stack returns a slightly different shape; collapse them into one. */
function normalize(out: Row | undefined): StackResultT {
  if (!out) return { emails: [], phones: [] };
  const profile = (out.profile ?? out) as Row;
  const mapEmail = (e: Row, unmatched = false): FoundEmail => ({
    address: (e.emailAddress ?? e.email) as string,
    type: e.type as string | null,
    status: (e.validationStatus ?? e.status) as string | null,
    score: e.deliverabilityScore as number | null,
    catchAll: e.isCatchAll as boolean | null,
    unmatched,
  });
  const emails = [
    ...((profile.emails ?? []) as Row[]).map((e) => mapEmail(e)),
    ...((profile.unmatchedWorkEmails ?? []) as Row[]).map((e) => mapEmail(e, true)),
  ].filter((e) => e.address);
  const phones = ((profile.phoneNumbers ?? []) as Row[]).map((p) => ({
    number: (p.phoneNumber ?? p.number) as string,
    type: p.type as string | null,
    callerId: p.callerIdValidation as FoundPhone["callerId"],
  })).filter((p) => p.number);
  return { emails, phones };
}

const STATUS: Record<string, { icon: React.ElementType; cls: string }> = {
  valid: { icon: CheckCircle2, cls: "text-emerald-600 dark:text-emerald-400" },
  risky: { icon: AlertTriangle, cls: "text-amber-600 dark:text-amber-400" },
  invalid: { icon: XCircle, cls: "text-red-600 dark:text-red-400" },
  unknown: { icon: HelpCircle, cls: "text-muted-foreground" },
};
const CALLER_ID: Record<string, string> = {
  EXACT_MATCH: "bg-emerald-600 hover:bg-emerald-600",
  PROBABLE_MATCH: "bg-emerald-500/80 hover:bg-emerald-500/80",
  FAMILY_MEMBER: "bg-amber-500 hover:bg-amber-500",
  BUSINESS_LINE: "bg-sky-600 hover:bg-sky-600",
  INCONCLUSIVE: "bg-muted-foreground hover:bg-muted-foreground",
};

function Dots({ n, icon: Icon, label }: { n: number; icon: React.ElementType; label: string }) {
  return (
    <span className="flex items-center gap-1" title={label}>
      <Icon className="h-3 w-3 text-muted-foreground" />
      {[1, 2, 3].map((i) => <span key={i} className={cn("h-1.5 w-1.5 rounded-full", i <= n ? "bg-primary" : "bg-muted")} />)}
    </span>
  );
}

interface RunSpec { runId: number; mode: InputMode; linkedin: string; fullName: string; domain: string; want: Want; patience: Patience | null }

function ResultBody({ result }: { result: StackResultT }) {
  if (result.emails.length + result.phones.length === 0) return <p className="text-sm text-muted-foreground">Nothing found.</p>;
  return (
    <div className="space-y-2">
      {result.emails.map((e) => {
        const st = STATUS[e.status ?? "unknown"] ?? STATUS.unknown;
        const Icon = st.icon;
        return (
          <div key={e.address} className="rounded-md border px-2.5 py-1.5">
            <div className="flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate font-mono text-xs">{e.address}</span>
              <CopyButton value={e.address} />
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className={cn("flex items-center gap-0.5", st.cls)}><Icon className="h-3 w-3" />{e.status ?? "unknown"}</span>
              {e.type && <Badge variant="outline" className="h-4 px-1 text-[10px] font-normal">{e.type}</Badge>}
              {e.catchAll && <Badge variant="outline" className="h-4 px-1 text-[10px] font-normal">catch-all</Badge>}
              {e.unmatched && <Badge variant="outline" className="h-4 px-1 text-[10px] font-normal" title="Work email at a company that doesn't match their current role">other company</Badge>}
              {e.score != null && (
                <span className="ml-auto flex items-center gap-1 text-muted-foreground" title="Deliverability score">
                  <span className="h-1 w-10 rounded-full bg-muted"><span className="block h-1 rounded-full bg-emerald-500" style={{ width: `${Math.round(e.score * (e.score <= 1 ? 100 : 1))}%` }} /></span>
                  {e.score <= 1 ? Math.round(e.score * 100) : Math.round(e.score)}
                </span>
              )}
            </div>
          </div>
        );
      })}
      {result.phones.map((p) => (
        <div key={p.number} className="rounded-md border px-2.5 py-1.5">
          <div className="flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate font-mono text-xs">{p.number}</span>
            <CopyButton value={p.number} />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
            {p.type && <Badge variant="outline" className="h-4 px-1 text-[10px] font-normal">{p.type}</Badge>}
            {p.callerId && (
              <Badge className={cn("h-4 px-1 text-[10px]", CALLER_ID[p.callerId.category])} title={p.callerId.reasoning}>
                <ShieldCheck className="mr-0.5 h-2.5 w-2.5" />{p.callerId.category.replace(/_/g, " ").toLowerCase()} · {p.callerId.callerIdName}
              </Badge>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Runs one stack once per runId and reports normalized results upward for the overlap table. */
function StackRun({ stack, spec, onDone }: { stack: StackDef; spec: RunSpec; onDone: (id: StackId, r: StackResultT | null) => void }) {
  const instant = trpc.enrichment.instantReveal.useMutation();
  const lite = trpc.enrichment.liteReveal.useMutation();
  const standard = trpc.enrichment.syncStandardReveal.useMutation();
  const turbo = trpc.enrichment.syncPremiumReveal.useMutation();
  const exTrigger = trpc.enrichment.triggerExhaustiveReveal.useMutation();
  const phone = trpc.enrichment.premiumPhone.useMutation();
  const basic = trpc.enrichment.basicWorkEmail.useMutation();
  const [taskId, setTaskId] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState<number | null>(null);
  const started = useRef(0);

  const exPoll = trpc.enrichment.pollExhaustiveReveal.useQuery({ taskId: taskId ?? "" }, {
    enabled: !!taskId,
    refetchInterval: (q) => (/completed|failed/.test(q.state.data?.output?.profile?.status ?? "") ? false : 15_000),
  });

  const m = { instant, lite, standard, turbo, exhaustive: exTrigger, premiumPhone: phone, basicWorkEmail: basic }[stack.id];

  useEffect(() => {
    started.current = Date.now();
    const person = spec.mode === "linkedin"
      ? { mode: "linkedin" as const, linkedinIdentifier: spec.linkedin }
      : { mode: "name-domain" as const, fullName: spec.fullName, companyDomain: spec.domain };
    const finish = (out: Row | undefined) => { setElapsed(Date.now() - started.current); onDone(stack.id, normalize(out)); };
    const fail = () => { setElapsed(Date.now() - started.current); onDone(stack.id, null); };
    switch (stack.id) {
      case "instant": instant.mutateAsync({ input: person, enrichmentType: spec.want }).then((r) => finish(r.output as Row), fail); break;
      case "lite": lite.mutateAsync({ input: person, enrichmentType: spec.want, patience: spec.patience }).then((r) => finish(r.output as Row), fail); break;
      case "standard": standard.mutateAsync({ linkedinUrl: spec.linkedin, enrichmentType: spec.want, patience: spec.patience }).then((r) => finish(r.output as Row), fail); break;
      case "turbo": turbo.mutateAsync({ linkedinUrl: spec.linkedin, enrichmentType: spec.want, patience: spec.patience }).then((r) => finish(r.output as Row), fail); break;
      case "premiumPhone": phone.mutateAsync({ linkedinUrl: spec.linkedin, patience: spec.patience }).then((r) => finish(r.output as Row), fail); break;
      case "basicWorkEmail": basic.mutateAsync({ fullName: spec.fullName, companyDomain: spec.domain }).then((r) => finish(r.output as Row), fail); break;
      case "exhaustive": exTrigger.mutateAsync({ linkedinUrl: spec.linkedin, enrichmentType: spec.want }).then((r) => setTaskId(r.output.taskId), fail); break;
    }
    // One fire per run; the mutation objects are stable for this component instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spec.runId]);

  const exStatus = exPoll.data?.output?.profile?.status;
  useEffect(() => {
    if (stack.id === "exhaustive" && exStatus && /completed|failed/.test(exStatus)) {
      setElapsed(Date.now() - started.current);
      onDone(stack.id, normalize(exPoll.data?.output as Row));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exStatus]);

  const exDone = !!exStatus && /completed|failed/.test(exStatus);
  const pending = m.isPending || (stack.id === "exhaustive" && !!taskId && !exDone);
  const error = m.error?.message ?? exPoll.error?.message ?? (exStatus === "failed" ? (exPoll.data?.output?.profile?.error as string | undefined) ?? "Exhaustive reveal failed" : null);
  const data = stack.id === "exhaustive" ? (exDone ? exPoll.data?.output : undefined) : m.data?.output;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm">{stack.label}</CardTitle>
        <span className="text-[11px] tabular-nums text-muted-foreground">
          {pending ? <span className="flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />{stack.id === "exhaustive" ? "polling every 15s…" : "running…"}</span> : elapsed != null && `${(elapsed / 1000).toFixed(1)}s`}
        </span>
      </CardHeader>
      <CardContent>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {!error && data && <ResultBody result={normalize(data as Row)} />}
      </CardContent>
    </Card>
  );
}

/** Which stack found which contact — only shown when comparing 2+ stacks. */
function Overlap({ results, stacks }: { results: Partial<Record<StackId, StackResultT | null>>; stacks: StackDef[] }) {
  const rows = useMemo(() => {
    const map = new Map<string, { kind: "email" | "phone"; found: Set<StackId> }>();
    for (const s of stacks) {
      const r = results[s.id];
      if (!r) continue;
      r.emails.forEach((e) => { const k = e.address.toLowerCase(); map.set(k, { kind: "email", found: (map.get(k)?.found ?? new Set()).add(s.id) }); });
      r.phones.forEach((p) => { const k = p.number.replace(/[^\d+]/g, ""); map.set(k, { kind: "phone", found: (map.get(k)?.found ?? new Set()).add(s.id) }); });
    }
    return Array.from(map.entries()).sort((a, b) => b[1].found.size - a[1].found.size);
  }, [results, stacks]);
  if (rows.length === 0) return null;
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">Who found what</CardTitle></CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-muted-foreground">
              <th className="py-1 text-left font-medium">Contact</th>
              {stacks.map((s) => <th key={s.id} className="px-2 py-1 font-medium">{s.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map(([k, v]) => (
              <tr key={k} className="border-t">
                <td className="py-1.5 font-mono">{v.kind === "email" ? <Mail className="mr-1 inline h-3 w-3" /> : <Phone className="mr-1 inline h-3 w-3" />}{k}</td>
                {stacks.map((s) => (
                  <td key={s.id} className="px-2 text-center">
                    {results[s.id] === undefined ? <span className="text-muted-foreground">…</span> : v.found.has(s.id) ? <CheckCircle2 className="mx-auto h-3.5 w-3.5 text-emerald-600" /> : <span className="text-muted-foreground">–</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

export default function ContactRevealPage() {
  const [mode, setMode] = useState<InputMode>("linkedin");
  const [linkedin, setLinkedin] = useState("");
  const [fullName, setFullName] = useState("");
  const [domain, setDomain] = useState("");
  const [want, setWant] = useState<Want>({ getWorkEmails: true, getPersonalEmails: false, getPhoneNumbers: false });
  const [patience, setPatience] = useState<Patience | "">("");
  const [picked, setPicked] = useState<StackId[]>(["standard"]);
  const [spec, setSpec] = useState<RunSpec | null>(null);
  const [ranStacks, setRanStacks] = useState<StackDef[]>([]);
  const [results, setResults] = useState<Partial<Record<StackId, StackResultT | null>>>({});

  const available = (s: StackDef) => s.modes.includes(mode) && s.cost(want) != null;
  const active = STACKS.filter((s) => picked.includes(s.id) && available(s));
  const total = active.reduce((n, s) => n + (s.cost(want) ?? 0), 0);
  const inputOk = mode === "linkedin" ? linkedin.trim().length > 2 : fullName.trim().length > 1 && domain.trim().length > 2;
  const anyData = want.getWorkEmails || want.getPersonalEmails || want.getPhoneNumbers;

  const toggle = (id: StackId) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const run = () => {
    setResults({});
    setRanStacks(active);
    setSpec({ runId: Date.now(), mode, linkedin: linkedin.trim(), fullName: fullName.trim(), domain: domain.trim(), want, patience: patience || null });
  };

  return (
    <div className="flex h-full flex-col">
      <Header icon={Contact} title="Contact Reveal" description="Every reveal stack in one place. Pick one, or run several side by side to compare." />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-6xl space-y-6">
          <Card>
            <CardContent className="space-y-5 pt-6">
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-medium">Find by</Label>
                  <ToggleButtonGroup<InputMode> value={mode} onChange={setMode} options={[{ value: "linkedin", label: "LinkedIn" }, { value: "name-domain", label: "Name + company" }]} />
                </div>
                {mode === "linkedin" ? (
                  <div className="flex flex-1 flex-col gap-1.5"><Label className="text-xs font-medium">LinkedIn URL or slug</Label><Input placeholder="https://www.linkedin.com/in/username" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} /></div>
                ) : (
                  <>
                    <div className="flex flex-col gap-1.5"><Label className="text-xs font-medium">Full name</Label><Input placeholder="Jane Doe" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-56" /></div>
                    <div className="flex flex-col gap-1.5"><Label className="text-xs font-medium">Company domain</Label><Input placeholder="acme.com" value={domain} onChange={(e) => setDomain(e.target.value)} className="w-48" /></div>
                  </>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <label className="flex items-center gap-2"><Checkbox checked={want.getWorkEmails} onCheckedChange={(v) => setWant((w) => ({ ...w, getWorkEmails: v === true }))} />Work email</label>
                <label className="flex items-center gap-2"><Checkbox checked={want.getPersonalEmails} onCheckedChange={(v) => setWant((w) => ({ ...w, getPersonalEmails: v === true }))} />Personal email</label>
                <label className="flex items-center gap-2"><Checkbox checked={want.getPhoneNumbers} onCheckedChange={(v) => setWant((w) => ({ ...w, getPhoneNumbers: v === true }))} />Phone</label>
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  Validation patience
                  <select value={patience} onChange={(e) => setPatience(e.target.value as Patience | "")} className="h-8 rounded-md border bg-background px-2 text-xs">
                    <option value="">Default</option>
                    {PATIENCE_LEVELS.map((p) => <option key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</option>)}
                  </select>
                </span>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {STACKS.map((s) => {
                  const ok = available(s);
                  const on = picked.includes(s.id) && ok;
                  const c = s.cost(want);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      aria-pressed={on}
                      disabled={!ok}
                      onClick={() => toggle(s.id)}
                      className={cn("rounded-lg border p-3 text-left transition-colors", on ? "border-primary bg-primary/5" : "hover:bg-muted/50", !ok && "cursor-not-allowed opacity-40")}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-2 text-sm font-medium">
                          {/* visual-only tick: a real Checkbox is a <button> and can't nest in this one */}
                          <span className={cn("grid h-4 w-4 place-content-center rounded-sm border border-primary", on && "bg-primary text-primary-foreground")}>{on && <Check className="h-3 w-3" />}</span>
                          {s.label}
                        </span>
                        <span className="text-xs tabular-nums text-muted-foreground">{c != null ? `≤${c} cr` : "n/a"}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{s.blurb}</p>
                      <div className="mt-2 flex gap-3"><Dots n={s.speed} icon={Zap} label="Speed" /><Dots n={s.coverage} icon={Layers} label="Coverage" /></div>
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={run} disabled={!inputOk || !anyData || active.length === 0}>
                  <Gauge className="mr-2 h-4 w-4" />
                  {active.length > 1 ? `Compare ${active.length} stacks` : `Reveal with ${active[0]?.label ?? "…"}`}
                </Button>
                {active.length > 0 && <span className="text-xs text-muted-foreground">Up to {total} credits. You&apos;re only charged for data that&apos;s found.</span>}
              </div>
            </CardContent>
          </Card>

          {spec && ranStacks.length > 1 && <Overlap results={results} stacks={ranStacks} />}
          {spec && (
            <div className={cn("grid gap-4", ranStacks.length > 1 && "md:grid-cols-2 xl:grid-cols-3")}>
              {ranStacks.map((s) => (
                <StackRun key={`${spec.runId}-${s.id}`} stack={s} spec={spec} onDone={(id, r) => setResults((prev) => ({ ...prev, [id]: r }))} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
