import { useState } from "react";
import { useRouter } from "next/router";
import { ArrowLeft, Loader2, Plus, Activity, Users, Building2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorDisplay } from "@/components/shared/error-display";

type Row = Record<string, unknown>;

export default function TrackerDetailPage() {
  const router = useRouter();
  const type = router.query.type === "person" ? "person" : "company";
  const listId = typeof router.query.listId === "string" ? router.query.listId : "";
  const isCompany = type === "company";
  const utils = trpc.useUtils();
  const [input, setInput] = useState("");

  const companyList = trpc.tracker.getCompanyList.useQuery({ listId }, { enabled: isCompany && !!listId });
  const personList = trpc.tracker.getPersonList.useQuery({ listId }, { enabled: !isCompany && !!listId });
  const listQuery = isCompany ? companyList : personList;

  const signalsQuery = trpc.tracker.signals.useQuery({ listId }, { enabled: !!listId });

  const addCompanies = trpc.tracker.addCompanies.useMutation({ onSuccess: () => { setInput(""); utils.tracker.getCompanyList.invalidate({ listId }); } });
  const addPeople = trpc.tracker.addPeople.useMutation({ onSuccess: () => { setInput(""); utils.tracker.getPersonList.invalidate({ listId }); } });
  const addMut = isCompany ? addCompanies : addPeople;

  const handleAdd = () => {
    const lines = input.split("\n").map((s) => s.trim()).filter(Boolean);
    if (!lines.length) return;
    if (isCompany) {
      addCompanies.mutate({ listId, companies: lines.map((l) => l.includes("linkedin.com") ? { linkedinUrl: l } : { domain: l }) });
    } else {
      addPeople.mutate({ listId, people: lines.map((l) => ({ linkedinUrl: l })) });
    }
  };

  const list = listQuery.data?.output as Row | undefined;
  const signals = (signalsQuery.data?.output?.signals ?? []) as Row[];

  return (
    <div className="flex h-full flex-col">
      <Header
        icon={isCompany ? Building2 : Users}
        title={(list?.name as string) ?? "Tracker list"}
        description={`${isCompany ? "Company" : "People"} tracker · add members and review change signals`}
      />

      <div className="border-b p-4 space-y-3">
        <Button variant="ghost" size="sm" onClick={() => router.push(`/trackers/${type === "person" ? "people" : "companies"}`)}>
          <ArrowLeft className="mr-2 h-4 w-4" />Back to lists
        </Button>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">
            {isCompany ? "Add companies — domains or LinkedIn URLs (one per line)" : "Add people — LinkedIn URLs (one per line)"}
          </Label>
          <Textarea
            className="min-h-[80px] font-mono text-xs"
            placeholder={isCompany ? "stripe.com\nhttps://www.linkedin.com/company/microsoft" : "https://www.linkedin.com/in/williamhgates"}
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <Button onClick={handleAdd} disabled={!input.trim() || addMut.isPending}>
            {addMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Add to list
          </Button>
          {addMut.isError && <div className="mt-2"><ErrorDisplay message={addMut.error.message} /></div>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-2xl space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4" />Signals</CardTitle></CardHeader>
            <CardContent>
              {signalsQuery.isError && <ErrorDisplay message={signalsQuery.error.message} />}
              {signalsQuery.isSuccess && signals.length === 0 && (
                <EmptyState icon={Activity} title="No signals yet" description="Signals appear here as tracked members change (funding, hiring, job changes, etc.)." />
              )}
              {signals.length > 0 && (
                <div className="space-y-3">
                  {signals.map((s, i) => (
                    <div key={(s.id as string) ?? i} className="border-b pb-3 last:border-0 last:pb-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">{String(s.type ?? "signal").replace(/_/g, " ")}</Badge>
                        {(s.observedAt as string) && <span className="text-xs text-muted-foreground" suppressHydrationWarning>{new Date(s.observedAt as string).toLocaleDateString()}</span>}
                      </div>
                      {(s.summary as string) && <p className="text-sm">{s.summary as string}</p>}
                      {(s.linkedinIdentifier as string) && (
                        <a href={`https://www.linkedin.com/${isCompany ? "company" : "in"}/${s.linkedinIdentifier as string}`} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                          {s.linkedinIdentifier as string}
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
