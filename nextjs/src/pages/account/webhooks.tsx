import { useMemo, useState } from "react";
import {
  Webhook, Plus, Loader2, Trash2, RotateCw, Send, Pencil, Pause, Play, KeyRound, ChevronDown, ChevronRight,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { CopyButton } from "@/components/shared/copy-button";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorDisplay } from "@/components/shared/error-display";
import { JsonView } from "@/components/shared/json-view";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { useToast } from "@/hooks/use-toast";

interface EventType { eventType: string; description: string; group: string; examplePayload: Record<string, unknown> }
interface Endpoint { endpointId: string; url: string; eventTypes: string[]; description?: string | null; disabled: boolean; createdAt: string; updatedAt: string }

const fmtDate = (iso: string) => {
  try { return new Date(iso).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }); } catch { return iso; }
};

function groupEvents(events: EventType[]) {
  const groups = new Map<string, EventType[]>();
  for (const e of events) groups.set(e.group, [...(groups.get(e.group) ?? []), e]);
  return Array.from(groups.entries());
}

/** Create / edit form. `initial` = edit mode. */
function EndpointDialog({
  open, onOpenChange, events, initial, onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  events: EventType[];
  initial?: Endpoint;
  onSaved: (secret?: string) => void;
}) {
  const [url, setUrl] = useState(initial?.url ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [selected, setSelected] = useState<Set<string>>(new Set(initial?.eventTypes ?? []));
  const create = trpc.webhooks.create.useMutation();
  const update = trpc.webhooks.update.useMutation();
  const pending = create.isPending || update.isPending;
  const error = create.error ?? update.error;

  const toggle = (t: string) => setSelected((s) => {
    const next = new Set(s);
    if (next.has(t)) next.delete(t); else next.add(t);
    return next;
  });
  const toggleGroup = (types: string[], on: boolean) => setSelected((s) => {
    const next = new Set(s);
    types.forEach((t) => (on ? next.add(t) : next.delete(t)));
    return next;
  });

  const submit = async () => {
    const eventTypes = Array.from(selected);
    if (initial) {
      await update.mutateAsync({ endpointId: initial.endpointId, url, eventTypes, description: description.trim() || null });
      onSaved();
    } else {
      const res = await create.mutateAsync({ url, eventTypes, description: description.trim() || undefined });
      onSaved(res.output.signingSecret);
    }
  };

  const validUrl = /^https:\/\/\S+$/.test(url.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit endpoint" : "Add webhook endpoint"}</DialogTitle>
          <DialogDescription>Fiber will POST a signed JSON payload to this URL whenever a subscribed event fires.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="endpoint-url" className="text-xs font-medium">Endpoint URL</Label>
            <Input id="endpoint-url" placeholder="https://api.example.com/webhooks/fiber" value={url} onChange={(e) => setUrl(e.target.value)} />
            {url && !validUrl && <p className="text-xs text-destructive">Must be an https:// URL</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-xs font-medium">Description (optional)</Label>
            <Input id="description" placeholder="Production CRM sync" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium">Events ({selected.size} selected)</Label>
            <div className="space-y-3 rounded-md border p-3">
              {groupEvents(events).map(([group, items]) => {
                const types = items.map((i) => i.eventType);
                const allOn = types.every((t) => selected.has(t));
                return (
                  <div key={group} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{group}</p>
                      <button type="button" className="text-xs text-primary hover:underline" onClick={() => toggleGroup(types, !allOn)}>
                        {allOn ? "Clear" : "Select all"}
                      </button>
                    </div>
                    {items.map((e) => (
                      <label key={e.eventType} className="flex items-start gap-2 cursor-pointer">
                        <Checkbox className="mt-0.5" checked={selected.has(e.eventType)} onCheckedChange={() => toggle(e.eventType)} />
                        <span className="text-sm">
                          <code className="text-xs font-mono">{e.eventType}</code>
                          <span className="block text-xs text-muted-foreground">{e.description}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error.message}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={pending || !validUrl || selected.size === 0}>
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {initial ? "Save changes" : "Create endpoint"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SecretDialog({ secret, onClose }: { secret: string | null; onClose: () => void }) {
  return (
    <Dialog open={!!secret} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><KeyRound className="h-4 w-4" /> Signing secret</DialogTitle>
          <DialogDescription>
            Store this somewhere safe — it won&apos;t be shown again. Use it to verify the signature on every delivery.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2 rounded-md border bg-muted/40 p-3">
          <code className="flex-1 break-all text-xs font-mono">{secret}</code>
          {secret && <CopyButton value={secret} />}
        </div>
        <DialogFooter><Button onClick={onClose}>Done</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EndpointCard({ ep, events, onEdit, onSecret }: { ep: Endpoint; events: EventType[]; onEdit: () => void; onSecret: (s: string) => void }) {
  const utils = trpc.useUtils();
  const { toast } = useToast();
  const [testEvent, setTestEvent] = useState(ep.eventTypes[0] ?? events[0]?.eventType ?? "");
  const invalidate = () => utils.webhooks.list.invalidate();

  const update = trpc.webhooks.update.useMutation({ onSuccess: invalidate });
  const del = trpc.webhooks.delete.useMutation({
    onSuccess: () => { invalidate(); toast({ title: "Endpoint deleted" }); },
    onError: (e) => toast({ title: "Delete failed", description: e.message, variant: "destructive" }),
  });
  const rotate = trpc.webhooks.rotateSecret.useMutation({
    onSuccess: (r) => onSecret(r.output.signingSecret),
    onError: (e) => toast({ title: "Rotate failed", description: e.message, variant: "destructive" }),
  });
  const test = trpc.webhooks.sendTest.useMutation({
    onSuccess: (r) => toast({ title: "Test event sent", description: `Message ${r.output.messageId}` }),
    onError: (e) => toast({ title: "Test failed", description: e.message, variant: "destructive" }),
  });

  const testOptions = ep.eventTypes.length > 0 ? ep.eventTypes : events.map((e) => e.eventType);

  return (
    <Card className={ep.disabled ? "opacity-70" : undefined}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-sm font-mono break-all">{ep.url}</CardTitle>
            {ep.description && <CardDescription className="mt-1">{ep.description}</CardDescription>}
          </div>
          <Badge variant={ep.disabled ? "outline" : "secondary"} className="shrink-0">
            <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${ep.disabled ? "bg-muted-foreground" : "bg-success"}`} />
            {ep.disabled ? "Paused" : "Active"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-1">
          {ep.eventTypes.length === 0
            ? <Badge variant="outline">All events</Badge>
            : ep.eventTypes.map((t) => <Badge key={t} variant="outline" className="font-mono text-[11px] font-normal">{t}</Badge>)}
        </div>
        <p className="text-xs text-muted-foreground" suppressHydrationWarning>
          Created {fmtDate(ep.createdAt)} · Updated {fmtDate(ep.updatedAt)} · <span className="font-mono">{ep.endpointId}</span>
        </p>
        <div className="flex flex-wrap items-center gap-2 border-t pt-3">
          <select
            value={testEvent}
            onChange={(e) => setTestEvent(e.target.value)}
            className="h-8 rounded-md border bg-card px-2 text-xs font-mono max-w-[16rem]"
            aria-label="Test event type"
          >
            {testOptions.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <Button size="sm" variant="outline" disabled={test.isPending || !testEvent} onClick={() => test.mutate({ endpointId: ep.endpointId, eventType: testEvent })}>
            {test.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Send className="mr-1.5 h-3.5 w-3.5" />}
            Send test
          </Button>
          <div className="flex-1" />
          <Button size="sm" variant="ghost" disabled={update.isPending} onClick={() => update.mutate({ endpointId: ep.endpointId, disabled: !ep.disabled })}>
            {ep.disabled ? <Play className="mr-1.5 h-3.5 w-3.5" /> : <Pause className="mr-1.5 h-3.5 w-3.5" />}
            {ep.disabled ? "Resume" : "Pause"}
          </Button>
          <Button size="sm" variant="ghost" onClick={onEdit}><Pencil className="mr-1.5 h-3.5 w-3.5" />Edit</Button>
          <ConfirmDialog
            trigger={<Button size="sm" variant="ghost" disabled={rotate.isPending}><RotateCw className="mr-1.5 h-3.5 w-3.5" />Rotate secret</Button>}
            title="Rotate signing secret?"
            description="A new secret is generated now. The old one keeps working for 24 hours so in-flight deliveries still verify."
            confirmLabel="Rotate"
            variant="default"
            onConfirm={() => rotate.mutate({ endpointId: ep.endpointId })}
          />
          <ConfirmDialog
            trigger={<Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" disabled={del.isPending}><Trash2 className="mr-1.5 h-3.5 w-3.5" />Delete</Button>}
            title="Delete this endpoint?"
            description={`Deliveries to ${ep.url} stop immediately. This can't be undone.`}
            confirmLabel="Delete"
            onConfirm={() => del.mutate({ endpointId: ep.endpointId })}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function EventCatalog({ events }: { events: EventType[] }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="space-y-4">
      {groupEvents(events).map(([group, items]) => (
        <div key={group}>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{group}</p>
          <div className="divide-y rounded-md border">
            {items.map((e) => {
              const isOpen = open === e.eventType;
              return (
                <div key={e.eventType}>
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : e.eventType)}
                    className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-muted/50"
                  >
                    {isOpen ? <ChevronDown className="mt-0.5 h-4 w-4 shrink-0" /> : <ChevronRight className="mt-0.5 h-4 w-4 shrink-0" />}
                    <span>
                      <code className="text-xs font-mono font-medium">{e.eventType}</code>
                      <span className="block text-xs text-muted-foreground">{e.description}</span>
                    </span>
                  </button>
                  {isOpen && <div className="px-3 pb-3"><JsonView value={e.examplePayload} /></div>}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function WebhooksPage() {
  const utils = trpc.useUtils();
  const endpoints = trpc.webhooks.list.useQuery();
  const eventTypes = trpc.webhooks.eventTypes.useQuery(undefined, { staleTime: 10 * 60_000 });
  const [dialog, setDialog] = useState<{ mode: "create" } | { mode: "edit"; ep: Endpoint } | null>(null);
  const [secret, setSecret] = useState<string | null>(null);

  const events = useMemo(() => (eventTypes.data?.output.eventTypes ?? []) as EventType[], [eventTypes.data]);
  const list = (endpoints.data?.output.endpoints ?? []) as Endpoint[];

  return (
    <div className="flex h-full flex-col">
      <Header icon={Webhook} title="Webhooks" description="Get notified when async jobs finish, trackers fire, or saved searches run">
        <Button onClick={() => setDialog({ mode: "create" })} disabled={!eventTypes.data}>
          <Plus className="mr-2 h-4 w-4" /> Add endpoint
        </Button>
      </Header>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <section className="space-y-3">
            <h2 className="text-sm font-semibold">Endpoints</h2>
            {endpoints.isLoading && <LoadingSkeleton />}
            {endpoints.isError && <ErrorDisplay message={endpoints.error.message} onRetry={() => endpoints.refetch()} />}
            {endpoints.isSuccess && list.length === 0 && (
              <EmptyState icon={Webhook} title="No endpoints yet" description="Add an HTTPS endpoint and choose which events it should receive.">
                <Button onClick={() => setDialog({ mode: "create" })} disabled={!eventTypes.data}><Plus className="mr-2 h-4 w-4" />Add endpoint</Button>
              </EmptyState>
            )}
            {list.map((ep) => (
              <EndpointCard key={ep.endpointId} ep={ep} events={events} onEdit={() => setDialog({ mode: "edit", ep })} onSecret={setSecret} />
            ))}
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold">Event types</h2>
            {eventTypes.isLoading && <LoadingSkeleton />}
            {eventTypes.isError && <ErrorDisplay message={eventTypes.error.message} onRetry={() => eventTypes.refetch()} />}
            {events.length > 0 && <EventCatalog events={events} />}
          </section>
        </div>
      </div>

      {dialog && (
        <EndpointDialog
          key={dialog.mode === "edit" ? dialog.ep.endpointId : "new"}
          open
          onOpenChange={(o) => !o && setDialog(null)}
          events={events}
          initial={dialog.mode === "edit" ? dialog.ep : undefined}
          onSaved={(s) => {
            setDialog(null);
            utils.webhooks.list.invalidate();
            if (s) setSecret(s);
          }}
        />
      )}
      <SecretDialog secret={secret} onClose={() => setSecret(null)} />
    </div>
  );
}
