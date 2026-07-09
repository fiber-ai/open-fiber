import { useState } from "react";
import { Camera, Loader2, ExternalLink } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorDisplay } from "@/components/shared/error-display";

export default function ScreenshotPage() {
  const [url, setUrl] = useState("");
  const [fullPage, setFullPage] = useState(false);
  const [format, setFormat] = useState<"desktop" | "mobile">("desktop");

  const shot = trpc.tools.webpageScreenshot.useMutation();

  const handleSubmit = () => {
    if (!url.trim()) return;
    shot.mutate({ url: url.trim(), fullPage, format });
  };

  const out = shot.data?.output;

  return (
    <div className="flex h-full flex-col">
      <Header icon={Camera} title="Webpage Screenshot" description="Capture a screenshot of any public web page" />

      <div className="border-b p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[260px] space-y-1.5">
            <Label className="text-xs font-medium">Page URL</Label>
            <Input placeholder="https://example.com" value={url} onChange={(e) => setUrl(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Format</Label>
            <select value={format} onChange={(e) => setFormat(e.target.value as "desktop" | "mobile")} className="rounded-md border bg-background px-2 py-1.5 text-sm h-9">
              <option value="desktop">Desktop</option>
              <option value="mobile">Mobile</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm h-9">
            <Checkbox checked={fullPage} onCheckedChange={(v) => setFullPage(v === true)} />
            Full page
          </label>
          <Button onClick={handleSubmit} disabled={!url.trim() || shot.isPending}>
            {shot.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
            Capture
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {shot.isError && <ErrorDisplay message={shot.error.message} />}
        {shot.isSuccess && out?.screenshotUrl && (
          <div className="mx-auto max-w-3xl space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{out.title ?? url}</p>
              <a href={out.screenshotUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline">
                Open image <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <Card>
              <CardContent className="p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={out.screenshotUrl} alt="Screenshot" className="w-full rounded border" />
              </CardContent>
            </Card>
          </div>
        )}
        {!shot.data && !shot.isPending && !shot.isError && (
          <EmptyState icon={Camera} title="Webpage screenshot" description="Enter a URL to capture a full-page or viewport screenshot." />
        )}
      </div>
    </div>
  );
}
