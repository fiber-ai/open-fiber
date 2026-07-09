import { useState } from "react";
import { useRouter } from "next/router";
import { Building2, Users, Plus, Trash2, Loader2, ChevronRight, Circle, CircleCheck } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorDisplay } from "@/components/shared/error-display";

type EntityType = "company" | "person";
type Row = Record<string, unknown>;

export function TrackerLists({ entityType }: { entityType: EntityType }) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const isCompany = entityType === "company";
  const [name, setName] = useState("");
  const [interval, setInterval] = useState(7);
  const [creating, setCreating] = useState(false);

  const companyLists = trpc.tracker.companyLists.useQuery(undefined, { enabled: isCompany });
  const personLists = trpc.tracker.personLists.useQuery(undefined, { enabled: !isCompany });
  const listsQuery = isCompany ? companyLists : personLists;

  const invalidate = () => (isCompany ? utils.tracker.companyLists.invalidate() : utils.tracker.personLists.invalidate());
  const createCompany = trpc.tracker.createCompanyList.useMutation({ onSuccess: () => { invalidate(); setName(""); setCreating(false); } });
  const createPerson = trpc.tracker.createPersonList.useMutation({ onSuccess: () => { invalidate(); setName(""); setCreating(false); } });
  const deleteCompany = trpc.tracker.deleteCompanyList.useMutation({ onSuccess: invalidate });
  const deletePerson = trpc.tracker.deletePersonList.useMutation({ onSuccess: invalidate });
  const createMut = isCompany ? createCompany : createPerson;
  const deleteMut = isCompany ? deleteCompany : deletePerson;

  const lists = (listsQuery.data?.output?.lists ?? []) as Row[];
  const Icon = isCompany ? Building2 : Users;
  const countKey = isCompany ? "companyCount" : "personCount";

  return (
    <div className="flex h-full flex-col">
      <Header icon={Icon} title={isCompany ? "Company Trackers" : "People Trackers"} description={`Monitor ${isCompany ? "companies" : "people"} for changes and get signals`} />

      <div className="border-b p-4">
        {creating ? (
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[220px] space-y-1.5">
              <Label className="text-xs font-medium">List name</Label>
              <Input placeholder="e.g. Target accounts" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Refresh (days)</Label>
              <Input type="number" min={1} max={90} value={interval} onChange={(e) => setInterval(Number(e.target.value) || 7)} className="w-28" />
            </div>
            <Button onClick={() => createMut.mutate({ name: name.trim(), refreshIntervalDays: interval })} disabled={!name.trim() || createMut.isPending}>
              {createMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Create
            </Button>
            <Button variant="ghost" onClick={() => setCreating(false)}>Cancel</Button>
          </div>
        ) : (
          <Button onClick={() => setCreating(true)}><Plus className="mr-2 h-4 w-4" />New tracker list</Button>
        )}
        {createMut.isError && <div className="mt-2"><ErrorDisplay message={createMut.error.message} /></div>}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {listsQuery.isError && <ErrorDisplay message={listsQuery.error.message} />}
        {listsQuery.isSuccess && lists.length === 0 && (
          <EmptyState icon={Icon} title="No tracker lists yet" description={`Create a list to start monitoring ${isCompany ? "companies" : "people"}.`} />
        )}
        {lists.length > 0 && (
          <div className="mx-auto max-w-2xl space-y-2">
            {lists.map((l) => {
              const id = (l.id as string) ?? "";
              const count = typeof l[countKey] === "number" ? (l[countKey] as number) : null;
              return (
                <Card key={id} className="cursor-pointer hover:bg-accent/50" onClick={() => router.push(`/trackers/${entityType}/${id}`)}>
                  <CardContent className="pt-4 flex items-center gap-3">
                    {l.isActive === false ? <Circle className="h-4 w-4 text-muted-foreground" /> : <CircleCheck className="h-4 w-4 text-green-600" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{(l.name as string) ?? "Untitled list"}</p>
                      <p className="text-xs text-muted-foreground">
                        {count != null ? `${count.toLocaleString()} ${isCompany ? "companies" : "people"}` : "—"}
                        {typeof l.refreshIntervalDays === "number" ? ` · every ${l.refreshIntervalDays}d` : ""}
                      </p>
                    </div>
                    {l.isActive === false && <Badge variant="secondary" className="text-xs">Paused</Badge>}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      title="Delete list"
                      onClick={(e) => { e.stopPropagation(); if (id) deleteMut.mutate({ listId: id }); }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
