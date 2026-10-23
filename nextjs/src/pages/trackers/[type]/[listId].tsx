import { useState } from "react";
import { useRouter } from "next/router";
import { ArrowLeft, Loader2, Plus, Activity, Users, Building2, RefreshCw, CalendarClock, Pause, Play, FlaskConical, Pencil, Check, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorDisplay } from "@/components/shared/error-display";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ToggleButtonGroup } from "@/components/shared/toggle-button-group";
import { JsonView } from "@/components/shared/json-view";
import { RulesPanel } from "@/components/trackers/rules-panel";
import { useToast } from "@/hooks/use-toast";

type Row = Record<string, unknown>;
type SignalFilter = "all" | "real" | "dummy";

const fmtDate = (iso?: string | null) => {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }); } catch { return iso; }
};

/** Name, cadence, active state, refresh-now and reschedule. */
function SettingsCard({ type, listId, list, onChanged }: { type: "company" | "person"; listId: string; list: Row; onChanged: () => void }) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(list.name as string);
  const [interval, setInterval] = useState(String(list.refreshIntervalDays ?? 7));
  const [date, setDate] = useState("");
  const update = trpc.tracker.updateList.useMutation({ onSuccess: () => { onChanged(); setEditing(false); } });
  const refresh = trpc.tracker.refreshList.useMutation({
    onSuccess: (r) => { onChanged(); toast({ title: "Refresh started", description: (r.output.message as string) ?? undefined }); },
    onError: (e) => toast({ title: "Refresh failed", description: e.message, variant: "destructive" }),
  });
  const reschedule = trpc.tracker.rescheduleList.useMutation({
    onSuccess: (r) => { onChanged(); setDate(""); toast({ title: "Rescheduled", description: `Next refresh ${fmtDate(r.output.newNextRefreshAt as string)}` }); },
    onError: (e) => toast({ title: "Reschedule failed", description: e.message, variant: "destructive" }),
  });
  const active = list.isActive !== false;
  const count = (list.companyCount ?? list.personCount) as number | undefined;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm">Schedule</CardTitle>
        <Badge variant={active ? "secondary" : "outline"}><span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${active ? "bg-success" : "bg-muted-foreground"}`} />{active ? "Active" : "Paused"}</Badge>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {editing ? (
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex flex-1 flex-col gap-1"><Label htmlFor="listId-name" className="text-xs">Name</Label><Input id="listId-name" value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="flex flex-col gap-1"><Label htmlFor="listId-every-days" className="text-xs">Every (days)</Label><Input id="listId-every-days" type="number" min={1} max={90} value={interval} onChange={(e) => setInterval(e.target.value)} className="w-20" /></div>
            <Button size="icon" onClick={() => update.mutate({ type, listId, name: name.trim(), refreshIntervalDays: Number(interval) || undefined })} disabled={update.isPending}>{update.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}</Button>
            <Button size="icon" variant="ghost" onClick={() => setEditing(false)} aria-label="Cancel editing"><X className="h-4 w-4" /></Button>
          </div>
        ) : (
          <dl className="grid grid-cols-2 gap-y-1.5 text-xs">
            <dt className="text-muted-foreground">Members</dt><dd>{count?.toLocaleString() ?? "—"}{list.isDynamic === true && " (dynamic)"}</dd>
            <dt className="text-muted-foreground">Refreshes</dt><dd>every {list.refreshIntervalDays as number} days</dd>
            <dt className="text-muted-foreground">Next refresh</dt><dd suppressHydrationWarning>{active ? fmtDate(list.nextRefreshAt as string | null) : "paused"}</dd>
            <dt className="text-muted-foreground">Created</dt><dd suppressHydrationWarning>{fmtDate(list.createdAt as string)}</dd>
          </dl>
        )}
        <div className="flex flex-wrap gap-2">
          {!editing && <Button size="sm" variant="outline" onClick={() => setEditing(true)}><Pencil className="mr-1.5 h-3.5 w-3.5" />Edit</Button>}
          <Button size="sm" variant="outline" disabled={update.isPending} onClick={() => update.mutate({ type, listId, isActive: !active })}>
            {active ? <Pause className="mr-1.5 h-3.5 w-3.5" /> : <Play className="mr-1.5 h-3.5 w-3.5" />}{active ? "Pause" : "Resume"}
          </Button>
          <ConfirmDialog
            trigger={<Button size="sm" variant="outline" disabled={refresh.isPending}>{refresh.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-1.5 h-3.5 w-3.5" />}Refresh now</Button>}
            title="Refresh this list now?"
            description={`Every member is re-checked against your rules right away. This costs credits like a scheduled refresh (${count ?? "?"} ${type === "company" ? "companies" : "people"}).`}
            confirmLabel="Refresh"
            variant="default"
            onConfirm={() => refresh.mutate({ type, listId })}
          />
        </div>
        <div className="flex items-end gap-2">
          <div className="flex flex-col gap-1"><Label htmlFor="listId-move-next-refresh-to" className="text-xs">Move next refresh to</Label><Input id="listId-move-next-refresh-to" type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} className="h-8 w-52 text-xs" /></div>
          <Button size="sm" variant="outline" disabled={!date || reschedule.isPending} onClick={() => reschedule.mutate({ type, listId, nextRefreshDate: new Date(date).toISOString() })}>
            {reschedule.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <CalendarClock className="mr-1.5 h-3.5 w-3.5" />}Reschedule
          </Button>
        </div>
        {update.isError && <p className="text-xs text-destructive">{update.error.message}</p>}
      </CardContent>
    </Card>
  );
}

export default function TrackerDetailPage() {
  const router = useRouter();
  const { toast } = useToast();
  const type = router.query.type === "person" ? "person" : "company";
  const listId = typeof router.query.listId === "string" ? router.query.listId : "";
  const isCompany = type === "company";
  const utils = trpc.useUtils();
  const [input, setInput] = useState("");
  const [filter, setFilter] = useState<SignalFilter>("all");
  const [openSignal, setOpenSignal] = useState<string | null>(null);

  const companyList = trpc.tracker.getCompanyList.useQuery({ listId }, { enabled: isCompany && !!listId });
  const personList = trpc.tracker.getPersonList.useQuery({ listId }, { enabled: !isCompany && !!listId });
  const listQuery = isCompany ? companyList : personList;
  const signalsQuery = trpc.tracker.signals.useQuery({ listId, filter }, { enabled: !!listId });

  const refetchList = () => (isCompany ? utils.tracker.getCompanyList.invalidate({ listId }) : utils.tracker.getPersonList.invalidate({ listId }));
  const addCompanies = trpc.tracker.addCompanies.useMutation({ onSuccess: () => { setInput(""); refetchList(); } });
  const addPeople = trpc.tracker.addPeople.useMutation({ onSuccess: () => { setInput(""); refetchList(); } });
  const addMut = isCompany ? addCompanies : addPeople;
  const fireDummy = trpc.tracker.fireDummy.useMutation({
    onSuccess: (r) => {
      const n = ((r.output.signals ?? []) as Row[]).length;
      setFilter("dummy");
      utils.tracker.signals.invalidate({ listId });
      toast({ title: n ? `Fired ${n} test signal${n > 1 ? "s" : ""}` : "No test rules on this list", description: n ? "They're also sent to any webhook endpoints subscribed to tracker events." : "Mark a rule as a test rule first." });
    },
    onError: (e) => toast({ title: "Couldn't fire test signals", description: e.message, variant: "destructive" }),
  });

  const handleAdd = () => {
    const lines = input.split("\n").map((s) => s.trim()).filter(Boolean);
    if (!lines.length) return;
    if (isCompany) addCompanies.mutate({ listId, companies: lines.map((l) => (l.includes("linkedin.com") ? { linkedinUrl: l } : { domain: l })) });
    else addPeople.mutate({ listId, people: lines.map((l) => ({ linkedinUrl: l })) });
  };

  const list = listQuery.data?.output as Row | undefined;
  const signals = (signalsQuery.data?.output?.signals ?? []) as Row[];
  const rules = (list?.trackingRules ?? []) as Row[];

  return (
    <div className="flex h-full flex-col">
      <Header icon={isCompany ? Building2 : Users} title={(list?.name as string) ?? "Tracker list"} description={`${isCompany ? "Company" : "People"} tracker · rules, schedule and change signals`}>
        <Button variant="ghost" size="sm" onClick={() => router.push(`/trackers/${type === "person" ? "people" : "companies"}`)}><ArrowLeft className="mr-2 h-4 w-4" />All lists</Button>
      </Header>

      <div className="flex-1 overflow-y-auto p-6">
        {listQuery.isError && <ErrorDisplay message={listQuery.error.message} />}
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <div className="space-y-4">
            {list && <SettingsCard key={`${list.name}-${list.refreshIntervalDays}`} type={type} listId={listId} list={list} onChanged={refetchList} />}
            {list && <RulesPanel entityType={type} listId={listId} rules={rules} onChanged={refetchList} />}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Add {isCompany ? "companies" : "people"}</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <Textarea className="min-h-[80px] font-mono text-xs" placeholder={isCompany ? "stripe.com\nhttps://www.linkedin.com/company/microsoft" : "https://www.linkedin.com/in/williamhgates"} value={input} onChange={(e) => setInput(e.target.value)} />
                <Button size="sm" onClick={handleAdd} disabled={!input.trim() || addMut.isPending}>
                  {addMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}Add to list
                </Button>
                {addMut.isError && <p className="text-xs text-destructive">{addMut.error.message}</p>}
              </CardContent>
            </Card>
          </div>

          <Card className="h-fit">
            <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0 pb-3">
              <CardTitle className="flex items-center gap-2 text-sm"><Activity className="h-4 w-4" />Signals</CardTitle>
              <div className="flex items-center gap-2">
                <ToggleButtonGroup<SignalFilter> value={filter} onChange={setFilter} options={[{ value: "all", label: "All" }, { value: "real", label: "Real" }, { value: "dummy", label: "Test" }]} />
                <Button size="sm" variant="outline" onClick={() => fireDummy.mutate({ listId })} disabled={fireDummy.isPending} title="Fire example signals for every test rule (free)">
                  {fireDummy.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <FlaskConical className="mr-1.5 h-3.5 w-3.5" />}Fire test signals
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {signalsQuery.isError && <ErrorDisplay message={signalsQuery.error.message} />}
              {signalsQuery.isSuccess && signals.length === 0 && (
                <EmptyState icon={Activity} title={filter === "dummy" ? "No test signals" : "No signals yet"} description={filter === "dummy" ? "Mark a rule as a test rule, then fire test signals to see the payload shape." : "Signals show up here as tracked members change (funding, hiring, job changes and so on)."} />
              )}
              <div className="space-y-3">
                {signals.map((s, i) => {
                  const id = (s.id as string) ?? String(i);
                  const change = s.changeData as unknown;
                  return (
                    <div key={id} className="space-y-1 border-b pb-3 last:border-0 last:pb-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" className="text-xs capitalize">{String(s.ruleType ?? s.type ?? "signal").replace(/_/g, " ")}</Badge>
                        {s.isDummy === true && <Badge variant="outline" className="text-[10px]"><FlaskConical className="mr-0.5 h-2.5 w-2.5" />test</Badge>}
                        {(s.observedAt ?? s.createdAt) ? <span className="text-xs text-muted-foreground" suppressHydrationWarning>{fmtDate((s.observedAt ?? s.createdAt) as string)}</span> : null}
                      </div>
                      {typeof s.summary === "string" && <p className="text-sm">{s.summary}</p>}
                      <div className="flex items-center gap-3 text-xs">
                        {typeof s.eventDate === "string" && <span className="text-muted-foreground" suppressHydrationWarning>event {new Date(s.eventDate).toLocaleDateString()}</span>}
                        {typeof s.linkedinIdentifier === "string" && (
                          <a href={typeof s.linkedinUrl === "string" ? s.linkedinUrl : `https://www.linkedin.com/${isCompany ? "company" : "in"}/${s.linkedinIdentifier}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{s.linkedinIdentifier}</a>
                        )}
                        {change != null && <button type="button" className="text-muted-foreground hover:text-foreground" onClick={() => setOpenSignal(openSignal === id ? null : id)}>{openSignal === id ? "Hide details" : "Details"}</button>}
                      </div>
                      {openSignal === id && <JsonView value={change} maxHeight="16rem" />}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
