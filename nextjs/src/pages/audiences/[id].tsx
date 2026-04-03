import { useState } from "react";
import { useRouter } from "next/router";
import { ArrowLeft, Trash2, RefreshCw, Loader2, ShieldCheck } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Header } from "@/components/layout/header";
import { AudienceMembersTable } from "@/components/audiences/audience-members-table";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ErrorDisplay } from "@/components/shared/error-display";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { formatNumber } from "@/lib/utils";
import Link from "next/link";

export default function AudienceDetailPage() {
  const router = useRouter();
  const id = router.query.id as string;
  const utils = trpc.useUtils();

  const status = trpc.audiences.getStatus.useQuery(
    { audienceId: id },
    { enabled: !!id, refetchInterval: (query) => {
      const data = query.state.data;
      const s = data?.output?.status;
      if (s && !["BUILDING", "SAVING_COMPANIES", "SAVING_PROSPECTS", "LINKING_PROSPECTS_WITH_COMPANIES", "HEALING_COMPANIES"].includes(s)) return false;
      return 3000;
    }}
  );

  const deleteMutation = trpc.audiences.delete.useMutation({
    onSuccess: () => {
      utils.audiences.list.invalidate();
      router.push("/audiences");
    },
  });

  const buildMutation = trpc.audiences.build.useMutation({
    onSuccess: () => {
      utils.audiences.getStatus.invalidate({ audienceId: id });
    },
  });

  const [exclName, setExclName] = useState("");
  const [exclType, setExclType] = useState<"company" | "prospect">("company");
  const [exclDialogOpen, setExclDialogOpen] = useState(false);

  const createCompanyExcl = trpc.exclusionLists.createCompanyListFromAudience.useMutation({
    onSuccess: () => { setExclDialogOpen(false); setExclName(""); },
  });
  const createProspectExcl = trpc.exclusionLists.createProspectListFromAudience.useMutation({
    onSuccess: () => { setExclDialogOpen(false); setExclName(""); },
  });
  const isExclPending = createCompanyExcl.isPending || createProspectExcl.isPending;

  const handleCreateExclusion = () => {
    if (!exclName.trim()) return;
    if (exclType === "company") {
      createCompanyExcl.mutate({ audienceId: id, name: exclName.trim() });
    } else {
      createProspectExcl.mutate({ audienceId: id, name: exclName.trim() });
    }
  };

  const statusData = status.data;
  const audience = statusData?.output;
  const isProcessing = audience?.status && ["BUILDING", "SAVING_COMPANIES", "SAVING_PROSPECTS", "LINKING_PROSPECTS_WITH_COMPANIES", "HEALING_COMPANIES"].includes(audience.status);

  if (!id) return null;

  return (
    <div className="flex h-full flex-col">
      <Header
        title={audience?.name ?? "Audience"}
        description={audience ? `Created ${new Date(audience.createdAt).toLocaleDateString()}` : undefined}
      >
        <Link href="/audiences">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <Button
          variant="outline"
          size="sm"
          onClick={() => buildMutation.mutate({ audienceId: id })}
          disabled={buildMutation.isPending || !!isProcessing}
        >
          {buildMutation.isPending || isProcessing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Build
        </Button>
        <Dialog open={exclDialogOpen} onOpenChange={setExclDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <ShieldCheck className="mr-2 h-4 w-4" />
              Create Exclusion List
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={(e) => { e.preventDefault(); handleCreateExclusion(); }}>
              <DialogHeader>
                <DialogTitle>Create Exclusion List from Audience</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>List Name</Label>
                  <Input placeholder="e.g. Exclude these companies" value={exclName} onChange={(e) => setExclName(e.target.value)} autoFocus />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <div className="flex gap-2">
                    <Button type="button" size="sm" variant={exclType === "company" ? "default" : "outline"} onClick={() => setExclType("company")}>
                      Company
                    </Button>
                    <Button type="button" size="sm" variant={exclType === "prospect" ? "default" : "outline"} onClick={() => setExclType("prospect")}>
                      Prospect
                    </Button>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setExclDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={!exclName.trim() || isExclPending}>
                  {isExclPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        <ConfirmDialog
          trigger={
            <Button variant="destructive" size="sm" disabled={deleteMutation.isPending}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          }
          title="Delete audience"
          description="This will permanently delete this audience. This action cannot be undone."
          confirmLabel="Delete"
          onConfirm={() => deleteMutation.mutate({ audienceId: id })}
        />
      </Header>

      {status.isLoading && (
        <div className="p-6">
          <LoadingSkeleton rows={3} />
        </div>
      )}

      {status.isError && (
        <div className="p-6">
          <ErrorDisplay
            message={status.error.message}
            onRetry={() => status.refetch()}
          />
        </div>
      )}

      {audience && (
        <>
          {/* Stats Bar */}
          <div className="border-b p-4">
            <div className="flex items-center gap-4">
              <Badge
                variant={audience.status === "NORMAL" ? "secondary" : audience.status === "FAILED" ? "destructive" : "default"}
                className="text-xs"
              >
                {audience.status}
              </Badge>
              <div className="flex gap-6 text-sm text-muted-foreground">
                <span>{formatNumber(audience.companiesCount ?? 0)} companies</span>
                <span>{formatNumber(audience.prospectsCount ?? 0)} prospects</span>
              </div>
            </div>
          </div>

          {/* Members */}
          <div className="flex-1 overflow-y-auto">
            <AudienceMembersTable audienceId={id} />
          </div>
        </>
      )}
    </div>
  );
}

interface StatusResult {
  output?: {
    audienceId: string;
    name: string;
    status: string;
    createdAt: string;
    companiesCount?: number;
    prospectsCount?: number;
  };
}
