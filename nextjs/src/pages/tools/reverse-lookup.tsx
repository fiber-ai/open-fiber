import { useState } from "react";
import { ScanSearch, Mail, Phone, Loader2, Search, Hash } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorDisplay } from "@/components/shared/error-display";
import { ToggleButtonGroup } from "@/components/shared/toggle-button-group";
import { PersonProfileCard, CompanyProfileCard } from "@/components/shared/profile-cards";
import { HemLookup } from "@/components/reverse-lookup/hem-lookup";

type Row = Record<string, unknown>;
type Tab = "email" | "phone" | "hashed";

function EmailLookup() {
  const [email, setEmail] = useState("");
  const [lite, setLite] = useState(false);
  const m = trpc.reverseLookup.email.useMutation();
  const people = ((m.data?.output as { data?: Row[] } | undefined)?.data ?? []);
  return (
    <div className="space-y-6">
      <form className="flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); if (email.trim()) m.mutate({ email: email.trim(), lite }); }}>
        <div className="flex flex-col gap-1.5"><Label htmlFor="reverse-lookup-email-address" className="text-xs font-medium">Email address</Label><Input id="reverse-lookup-email-address" type="email" placeholder="jane@acme.com" value={email} onChange={(e) => setEmail(e.target.value)} className="w-80" /></div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-medium">Depth</Label>
          <ToggleButtonGroup<"std" | "lite"> className="h-10" value={lite ? "lite" : "std"} onChange={(v) => setLite(v === "lite")} options={[{ value: "std", label: "Standard · 2 cr" }, { value: "lite", label: "Lite · 1 cr" }]} />
        </div>
        <Button type="submit" disabled={m.isPending || !email.trim()}>{m.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}Find person</Button>
      </form>
      <p className="text-xs text-muted-foreground">Lite is built for high volume: cheaper, but skips the extra steps that raise match rates. Have a name or company too? Kitchen Sink matches better.</p>
      {m.isError && <ErrorDisplay message={m.error.message} />}
      {m.isSuccess && people.length === 0 && <EmptyState icon={Mail} title="No match" description={lite ? "Lite found nothing. Try Standard for a deeper search." : "No LinkedIn profile is linked to this email."} />}
      {people.length > 1 && <p className="text-sm text-muted-foreground">{people.length} possible matches</p>}
      <div className="grid gap-4 lg:grid-cols-2">{people.map((p, i) => <PersonProfileCard key={i} p={p} />)}</div>
    </div>
  );
}

function PhoneLookup() {
  const [phone, setPhone] = useState("");
  const m = trpc.reverseLookup.phone.useMutation();
  const results = ((m.data?.output as { results?: Row[] } | undefined)?.results ?? []);
  return (
    <div className="space-y-6">
      <form className="flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); if (phone.trim()) m.mutate({ phoneNumber: phone.trim() }); }}>
        <div className="flex flex-col gap-1.5"><Label htmlFor="reverse-lookup-phone-number-with-country-code" className="text-xs font-medium">Phone number (with country code)</Label><Input id="reverse-lookup-phone-number-with-country-code" placeholder="+1 415 555 0134" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-64" /></div>
        <Button type="submit" disabled={m.isPending || phone.trim().length < 6}>{m.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}Look up · 3 cr</Button>
      </form>
      {m.isError && <ErrorDisplay message={m.error.message} />}
      {m.isSuccess && results.length === 0 && <EmptyState icon={Phone} title="No match" description="This number isn't linked to a person or company we know." />}
      <div className="grid gap-4 lg:grid-cols-2">
        {results.map((r, i) => (
          <div key={i} className="space-y-1.5">
            <Badge variant="outline" className="capitalize">{r.type as string}</Badge>
            {r.type === "company" ? <CompanyProfileCard c={r.company as Row} /> : <PersonProfileCard p={r.profile as Row} />}
            {typeof r.reason === "string" && <p className="text-xs text-muted-foreground">{r.reason}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ReverseLookupPage() {
  const [tab, setTab] = useState<Tab>("email");
  return (
    <div className="flex h-full flex-col">
      <Header icon={ScanSearch} title="Reverse Lookup" description="Turn an email, phone number or hashed email into the person (or company) behind it">
        <ToggleButtonGroup<Tab> value={tab} onChange={setTab} options={[{ value: "email", label: "Email", icon: Mail }, { value: "phone", label: "Phone", icon: Phone }, { value: "hashed", label: "Hashed email", icon: Hash }]} />
      </Header>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-5xl">{tab === "email" ? <EmailLookup /> : tab === "phone" ? <PhoneLookup /> : <HemLookup />}</div>
      </div>
    </div>
  );
}
