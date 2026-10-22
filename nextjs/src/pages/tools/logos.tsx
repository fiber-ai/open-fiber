import { useMemo, useState } from "react";
import { Image as ImageIcon, Loader2, Search, UserCircle2, Building2, Download, Sun, Moon } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorDisplay } from "@/components/shared/error-display";
import { CopyButton } from "@/components/shared/copy-button";
import { ToggleButtonGroup } from "@/components/shared/toggle-button-group";
import { cn } from "@/lib/utils";

type IdType = "domains" | "linkedinUrls" | "liOrgIds";
type Row = Record<string, unknown>;
type Tab = "logos" | "photos";
type Backdrop = "light" | "dark";

const LABELS: Record<IdType, string> = { domains: "Domains", linkedinUrls: "LinkedIn URLs", liOrgIds: "LinkedIn Org IDs" };
const ID_KEY: Record<IdType, string> = { domains: "domain", linkedinUrls: "linkedinUrl", liOrgIds: "liOrgId" };

const lines = (s: string) => Array.from(new Set(s.split("\n").map((x) => x.trim()).filter(Boolean)));

function downloadCsv(name: string, rows: string[][]) {
  const csv = rows.map((r) => r.map((c) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const a = document.createElement("a"); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
}

/** Logos are often transparent PNGs, so let people check them on light and dark. */
function Tile({ src, label, backdrop, round }: { src?: string | null; label: string; backdrop: Backdrop; round?: boolean }) {
  return (
    <Card className={cn(!src && "opacity-60")}>
      <CardContent className="flex flex-col items-center gap-2 p-3 text-center">
        <div className={cn("flex h-20 w-20 items-center justify-center overflow-hidden border", round ? "rounded-full" : "rounded-md", backdrop === "dark" ? "bg-neutral-900" : "bg-white")}>
          {src
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={src} alt={label} className={cn("h-full w-full", round ? "object-cover" : "object-contain p-1.5")} loading="lazy" />
            : (round ? <UserCircle2 className="h-8 w-8 text-muted-foreground" /> : <Building2 className="h-6 w-6 text-muted-foreground" />)}
        </div>
        <p className="w-full truncate text-xs font-medium" title={label}>{label.replace(/^https?:\/\/(www\.)?linkedin\.com\/(in|company)\//, "").replace(/\/$/, "")}</p>
        {src ? <span className="flex items-center gap-1 text-[11px] text-muted-foreground">image URL<CopyButton value={src} /></span> : <span className="text-[11px] text-muted-foreground">not found</span>}
      </CardContent>
    </Card>
  );
}

function CompanyLogos({ backdrop }: { backdrop: Backdrop }) {
  const [quick, setQuick] = useState("");
  const [type, setType] = useState<IdType>("domains");
  const [input, setInput] = useState("");
  const single = trpc.media.companyLogo.useMutation();
  const bulk = trpc.media.companyLogos.useMutation();

  const requested = bulk.variables?.values ?? [];
  const idKey = ID_KEY[bulk.variables?.type ?? type];
  const found = useMemo(() => {
    const items = ((bulk.data?.output?.data as Row | undefined)?.data ?? []) as Row[];
    return new Map(items.map((it) => [String(it[idKey]).toLowerCase(), it.logoUrl as string]));
  }, [bulk.data, idKey]);

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-3 pt-5">
          <Label className="text-xs font-medium">Quick lookup: any domain, LinkedIn URL, slug or org ID</Label>
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (quick.trim()) single.mutate({ identifier: quick.trim() }); }}>
            <Input placeholder="stripe.com" value={quick} onChange={(e) => setQuick(e.target.value)} className="max-w-md" />
            <Button type="submit" variant="outline" disabled={single.isPending || !quick.trim()}>{single.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}Find</Button>
          </form>
          {single.isError && <p className="text-sm text-destructive">{single.error.message}</p>}
          {single.isSuccess && (
            <div className="w-40"><Tile src={single.data.output.logoUrl} label={single.variables?.identifier ?? ""} backdrop={backdrop} /></div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 pt-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Label className="text-xs font-medium">Bulk (up to 10,000)</Label>
            <ToggleButtonGroup options={(Object.keys(LABELS) as IdType[]).map((t) => ({ value: t, label: LABELS[t] }))} value={type} onChange={(v) => setType(v as IdType)} />
          </div>
          <Textarea className="min-h-[120px] font-mono text-xs" placeholder={type === "domains" ? "stripe.com\nmicrosoft.com" : type === "linkedinUrls" ? "https://www.linkedin.com/company/stripe" : "1035\n1441"} value={input} onChange={(e) => setInput(e.target.value)} />
          <Button onClick={() => { const v = lines(input); if (v.length) bulk.mutate({ type, values: v }); }} disabled={!input.trim() || bulk.isPending}>
            {bulk.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}Fetch {lines(input).length || ""} logos
          </Button>
        </CardContent>
      </Card>

      {bulk.isError && <ErrorDisplay message={bulk.error.message} />}
      {bulk.isSuccess && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{found.size} of {requested.length} found</p>
            <Button variant="outline" size="sm" onClick={() => downloadCsv("company-logos.csv", [[ID_KEY[bulk.variables!.type], "logoUrl"], ...requested.map((r) => [r, found.get(r.toLowerCase()) ?? ""])])}><Download className="mr-1.5 h-3.5 w-3.5" />CSV</Button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {requested.map((r) => <Tile key={r} src={found.get(r.toLowerCase())} label={r} backdrop={backdrop} />)}
          </div>
        </>
      )}
    </div>
  );
}

function ProfilePictures({ backdrop }: { backdrop: Backdrop }) {
  const [input, setInput] = useState("");
  const m = trpc.media.profilePics.useMutation();
  const items = ((m.data?.output?.data ?? []) as { linkedinUrl: string; profilePicFound: boolean; profilePic: string | null }[]);
  const foundCount = items.filter((i) => i.profilePicFound).length;
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-4 pt-5">
          <Label className="text-xs font-medium">LinkedIn profile URLs, one per line (up to 10,000)</Label>
          <Textarea className="min-h-[140px] font-mono text-xs" placeholder={"https://www.linkedin.com/in/janedoe\nhttps://www.linkedin.com/in/rajkumar"} value={input} onChange={(e) => setInput(e.target.value)} />
          <Button onClick={() => { const v = lines(input); if (v.length) m.mutate({ linkedinUrls: v }); }} disabled={!input.trim() || m.isPending}>
            {m.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserCircle2 className="mr-2 h-4 w-4" />}Fetch {lines(input).length || ""} photos
          </Button>
        </CardContent>
      </Card>
      {m.isError && <ErrorDisplay message={m.error.message} />}
      {m.isSuccess && items.length === 0 && <EmptyState icon={UserCircle2} title="No photos" description="None of those profiles returned a picture." />}
      {items.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{foundCount} of {items.length} have a photo</p>
            <Button variant="outline" size="sm" onClick={() => downloadCsv("profile-pictures.csv", [["linkedinUrl", "profilePic"], ...items.map((i) => [i.linkedinUrl, i.profilePic ?? ""])])}><Download className="mr-1.5 h-3.5 w-3.5" />CSV</Button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {items.map((i) => <Tile key={i.linkedinUrl} src={i.profilePic} label={i.linkedinUrl} backdrop={backdrop} round />)}
          </div>
        </>
      )}
    </div>
  );
}

export default function LogosPage() {
  const [tab, setTab] = useState<Tab>("logos");
  const [backdrop, setBackdrop] = useState<Backdrop>("light");
  return (
    <div className="flex h-full flex-col">
      <Header icon={ImageIcon} title="Logos & Photos" description="Company logos and LinkedIn profile pictures, one at a time or in bulk">
        <ToggleButtonGroup<Backdrop> value={backdrop} onChange={setBackdrop} options={[{ value: "light", label: "Light", icon: Sun }, { value: "dark", label: "Dark", icon: Moon }]} />
        <ToggleButtonGroup<Tab> value={tab} onChange={setTab} options={[{ value: "logos", label: "Company logos", icon: Building2 }, { value: "photos", label: "Profile pictures", icon: UserCircle2 }]} />
      </Header>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-5xl">{tab === "logos" ? <CompanyLogos backdrop={backdrop} /> : <ProfilePictures backdrop={backdrop} />}</div>
      </div>
    </div>
  );
}
