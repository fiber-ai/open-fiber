import { useMemo, useState } from "react";
import { Plus, Trash2, Loader2, Eye, FlaskConical, Crown, Sparkles } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { JsonView } from "@/components/shared/json-view";
import { cn } from "@/lib/utils";

type Row = Record<string, unknown>;
type EntityType = "company" | "person";
interface RuleDef {
  name: string; readableName: string; entityType: EntityType; description: string; useCase: string;
  supportsInitialSignals: boolean; isPremium: boolean;
  config: { schema: Row; example: Row };
  signal: { schema: Row; example: Row };
}

const HIDDEN_KEYS = new Set(["type", "entityType", "isDummy", "id"]);

/** One-line summary of a rule's config, e.g. "direction: above · threshold: 500". */
function configSummary(rule: Row) {
  return Object.entries(rule)
    .filter(([k, v]) => !HIDDEN_KEYS.has(k) && v != null && !(Array.isArray(v) && v.length === 0))
    .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : String(v)}`)
    .join(" · ");
}

/** Field hints straight from the rule's JSON Schema, so people know what the config accepts. */
function SchemaHints({ schema }: { schema: Row }) {
  const props = (schema.properties ?? {}) as Record<string, Row>;
  const required = new Set((schema.required ?? []) as string[]);
  const rows = Object.entries(props).filter(([k]) => !HIDDEN_KEYS.has(k));
  if (rows.length === 0) return null;
  const typeOf = (p: Row): string => {
    if (Array.isArray(p.enum)) return (p.enum as unknown[]).map(String).join(" | ");
    if (p.type === "array") { const it = (p.items ?? {}) as Row; return `${Array.isArray(it.enum) ? `(${(it.enum as unknown[]).join(" | ")})` : String(it.type ?? "any")}[]`; }
    if (Array.isArray(p.anyOf)) return (p.anyOf as Row[]).map((x) => typeOf(x)).filter((t) => t !== "null").join(" | ");
    return String(p.type ?? "any");
  };
  return (
    <div className="rounded-md border text-xs">
      {rows.map(([k, p]) => (
        <div key={k} className="grid grid-cols-[9rem_1fr] gap-2 border-b px-2.5 py-1.5 last:border-0">
          <span className="font-mono">{k}{required.has(k) && <span className="text-destructive">*</span>}</span>
          <span className="text-muted-foreground"><span className="font-mono text-[11px] text-foreground/80">{typeOf(p)}</span>{typeof p.description === "string" && ` — ${p.description}`}</span>
        </div>
      ))}
    </div>
  );
}

function AddRuleDialog({ open, onOpenChange, entityType, rules, onAdd, adding }: {
  open: boolean; onOpenChange: (o: boolean) => void; entityType: EntityType; rules: RuleDef[];
  onAdd: (config: Row, lookbackDays?: number) => void; adding: boolean;
}) {
  const [picked, setPicked] = useState<RuleDef | null>(null);
  const [text, setText] = useState("");
  const [lookback, setLookback] = useState("");
  const preview = trpc.tracker.previewSignal.useMutation();

  const parsed = useMemo(() => {
    try { const v = JSON.parse(text) as Row; return v && typeof v === "object" ? { ok: true as const, value: v } : { ok: false as const, error: "Config must be a JSON object" }; }
    catch (e) { return { ok: false as const, error: (e as Error).message }; }
  }, [text]);
  const config = picked && parsed.ok ? { ...parsed.value, type: picked.name, entityType } : null;

  const pick = (r: RuleDef) => {
    setPicked(r);
    const { type: _t, entityType: _e, ...rest } = r.config.example as Row;
    void _t; void _e;
    setText(JSON.stringify(rest, null, 2));
    preview.reset();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) { setPicked(null); preview.reset(); } }}>
      <DialogContent className="max-h-[88vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add a tracking rule</DialogTitle>
          <DialogDescription>Pick what to watch for. Each rule starts from a working example you can tweak.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 md:grid-cols-[16rem_1fr]">
          <div className="max-h-[60vh] space-y-1 overflow-y-auto pr-1">
            {rules.map((r) => (
              <button key={r.name} type="button" onClick={() => pick(r)} className={cn("w-full rounded-md border px-2.5 py-2 text-left text-sm", picked?.name === r.name ? "border-primary bg-primary/5" : "hover:bg-muted/60")}>
                <span className="flex items-center gap-1.5 font-medium">{r.readableName}{r.isPremium && <Crown className="h-3 w-3 text-amber-500" />}</span>
                <span className="line-clamp-2 text-xs text-muted-foreground">{r.description}</span>
              </button>
            ))}
          </div>
          {picked ? (
            <div className="space-y-3">
              <div>
                <p className="flex items-center gap-2 font-medium">{picked.readableName}{picked.isPremium && <Badge variant="outline" className="border-amber-500/50 text-[10px] text-amber-600"><Crown className="mr-1 h-3 w-3" />Premium</Badge>}</p>
                <p className="text-sm text-muted-foreground">{picked.description}</p>
                <p className="mt-1 text-xs text-muted-foreground"><span className="font-medium text-foreground">Use it for:</span> {picked.useCase}</p>
                {picked.isPremium && <p className="mt-1 text-xs text-amber-600">Premium rules watch news and LinkedIn activity too. A list with any premium rule bills a minimum per entity per refresh.</p>}
              </div>
              <SchemaHints schema={picked.config.schema} />
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Config (JSON)</Label>
                <Textarea rows={8} className="font-mono text-xs" value={text} onChange={(e) => setText(e.target.value)} />
                {!parsed.ok && <p className="text-xs text-destructive">{parsed.error}</p>}
              </div>
              {picked.supportsInitialSignals && (
                <div className="flex items-center gap-2 text-xs">
                  <Label className="text-xs">Backfill signals from the last</Label>
                  <input type="number" min={1} max={365} placeholder="—" value={lookback} onChange={(e) => setLookback(e.target.value)} className="h-7 w-16 rounded-md border bg-background px-2" />
                  <span className="text-muted-foreground">days (optional)</span>
                </div>
              )}
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={!config || preview.isPending} onClick={() => config && preview.mutate({ config })}>
                  {preview.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Eye className="mr-1.5 h-3.5 w-3.5" />}Preview signal
                </Button>
              </div>
              {preview.isError && <p className="text-sm text-destructive">{preview.error.message}</p>}
              {preview.data && (() => {
                const sig = (preview.data.output as { signal?: Row }).signal;
                return sig ? (
                  <div className="space-y-1.5 rounded-md border bg-muted/30 p-3">
                    <p className="flex items-center gap-1.5 text-sm"><Sparkles className="h-3.5 w-3.5 text-primary" />{sig.summary as string}</p>
                    <JsonView value={sig.changeData} maxHeight="12rem" />
                  </div>
                ) : null;
              })()}
            </div>
          ) : (
            <p className="self-center text-center text-sm text-muted-foreground">Choose a rule on the left.</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={!config || adding} onClick={() => config && onAdd(config, lookback ? Number(lookback) : undefined)}>
            {adding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Add rule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RulesPanel({ entityType, listId, rules: current, onChanged }: { entityType: EntityType; listId: string; rules: Row[]; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const catalog = trpc.tracker.availableRules.useQuery(undefined, { staleTime: 30 * 60_000 });
  const update = trpc.tracker.updateList.useMutation({ onSuccess: () => { onChanged(); setOpen(false); } });
  const defs = ((entityType === "company" ? catalog.data?.output.companyRules : catalog.data?.output.personRules) ?? []) as RuleDef[];
  const nameOf = (t: string) => defs.find((d) => d.name === t)?.readableName ?? t.replace(/_/g, " ");
  const premium = (t: string) => defs.find((d) => d.name === t)?.isPremium;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm">Tracking rules</CardTitle>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)} disabled={!catalog.data}><Plus className="mr-1.5 h-3.5 w-3.5" />Add rule</Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {current.length === 0 && <p className="text-sm text-muted-foreground">No rules yet, so nothing will fire. Add one to start getting signals.</p>}
        {current.map((r) => {
          const id = r.id as string;
          const dummy = r.isDummy === true;
          return (
            <div key={id} className="flex items-start gap-2 rounded-md border px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium">
                  {nameOf(r.type as string)}
                  {premium(r.type as string) && <Crown className="h-3 w-3 text-amber-500" />}
                  {dummy && <Badge variant="outline" className="h-4 px-1 text-[10px]"><FlaskConical className="mr-0.5 h-2.5 w-2.5" />test</Badge>}
                </p>
                <p className="truncate text-xs text-muted-foreground">{configSummary(r) || "default settings"}</p>
              </div>
              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" disabled={update.isPending} title={dummy ? "Make this a real rule" : "Turn into a test-only rule that fires on demand"}
                onClick={() => update.mutate({ type: entityType, listId, updateRuleFlags: [{ ruleId: id, isDummy: !dummy }] })}>
                {dummy ? "Make live" : "Make test"}
              </Button>
              <ConfirmDialog
                trigger={<Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>}
                title="Remove this rule?"
                description={`${nameOf(r.type as string)} will stop producing signals for this list.`}
                confirmLabel="Remove"
                onConfirm={() => update.mutate({ type: entityType, listId, removeRuleIds: [id] })}
              />
            </div>
          );
        })}
        {update.isError && <p className="text-sm text-destructive">{update.error.message}</p>}
      </CardContent>
      <AddRuleDialog
        open={open}
        onOpenChange={setOpen}
        entityType={entityType}
        rules={defs}
        adding={update.isPending}
        onAdd={(config, lookbackDays) => update.mutate({ type: entityType, listId, addRules: [config as { type: string }], initialSignalsLookbackDays: lookbackDays })}
      />
    </Card>
  );
}
