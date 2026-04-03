import { useState } from "react";
import Link from "next/link";
import { ShieldCheck, Plus, Trash2, Loader2, Building2, Users } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorDisplay } from "@/components/shared/error-display";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

type ActiveTab = "company" | "prospect";

export default function ExclusionListsPage() {
  const utils = trpc.useUtils();
  const [activeTab, setActiveTab] = useState<ActiveTab>("company");
  const [newName, setNewName] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const companyLists = trpc.exclusionLists.listCompanyLists.useQuery(undefined, { staleTime: 10_000 });
  const prospectLists = trpc.exclusionLists.listProspectLists.useQuery(undefined, { staleTime: 10_000 });

  const createCompany = trpc.exclusionLists.createCompanyList.useMutation({
    onSuccess: () => { utils.exclusionLists.listCompanyLists.invalidate(); setNewName(""); setDialogOpen(false); },
  });
  const createProspect = trpc.exclusionLists.createProspectList.useMutation({
    onSuccess: () => { utils.exclusionLists.listProspectLists.invalidate(); setNewName(""); setDialogOpen(false); },
  });
  const deleteCompany = trpc.exclusionLists.deleteCompanyList.useMutation({
    onSuccess: () => utils.exclusionLists.listCompanyLists.invalidate(),
  });
  const deleteProspect = trpc.exclusionLists.deleteProspectList.useMutation({
    onSuccess: () => utils.exclusionLists.listProspectLists.invalidate(),
  });

  const companyData = companyLists.data;
  const prospectData = prospectLists.data;
  const companyItems = companyData?.output ?? [];
  const prospectItems = prospectData?.output ?? [];

  const items = activeTab === "company"
    ? companyItems.map((l) => ({ id: l.listID, name: l.name }))
    : prospectItems.map((l) => ({ id: l.listId, name: l.name }));
  const isLoading = activeTab === "company" ? companyLists.isLoading : prospectLists.isLoading;
  const isError = activeTab === "company" ? companyLists.isError : prospectLists.isError;
  const error = activeTab === "company" ? companyLists.error : prospectLists.error;
  const isCreatePending = createCompany.isPending || createProspect.isPending;

  const handleCreate = () => {
    if (!newName.trim()) return;
    if (activeTab === "company") createCompany.mutate({ name: newName.trim() });
    else createProspect.mutate({ name: newName.trim() });
  };

  const handleDelete = (listId: string) => {
    if (activeTab === "company") deleteCompany.mutate({ listIDs: [listId] });
    else deleteProspect.mutate({ listIds: [listId] });
  };

  return (
    <div className="flex h-full flex-col">
      <Header title="Exclusion Lists" description="Prevent duplicate outreach">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />New List</Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={(e) => { e.preventDefault(); handleCreate(); }}>
              <DialogHeader><DialogTitle>Create {activeTab === "company" ? "Company" : "Prospect"} Exclusion List</DialogTitle></DialogHeader>
              <div className="py-4"><Input placeholder="e.g. Existing Customers" value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus /></div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={!newName.trim() || isCreatePending}>
                  {isCreatePending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </Header>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b px-4 pt-3">
        <button className={`flex items-center gap-1.5 border-b-2 px-3 pb-2 text-sm font-medium ${activeTab === "company" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`} onClick={() => setActiveTab("company")}>
          <Building2 className="h-4 w-4" /> Company Lists
          {companyData?.output && <Badge variant="secondary" className="text-xs">{companyData.output.length}</Badge>}
        </button>
        <button className={`flex items-center gap-1.5 border-b-2 px-3 pb-2 text-sm font-medium ${activeTab === "prospect" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`} onClick={() => setActiveTab("prospect")}>
          <Users className="h-4 w-4" /> Prospect Lists
          {prospectData?.output && <Badge variant="secondary" className="text-xs">{prospectData.output.length}</Badge>}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {isLoading && <LoadingSkeleton rows={3} />}
        {isError && <ErrorDisplay message={error!.message} />}
        {items.length === 0 && !isLoading && !isError && (
          <EmptyState icon={ShieldCheck} title={`No ${activeTab} exclusion lists`} description={`Create a list to prevent contacting the same ${activeTab === "company" ? "companies" : "prospects"} twice.`} />
        )}
        {items.length > 0 && (
          <div className="space-y-2">
            {items.map((list) => (
              <Card key={list.id}>
                <CardContent className="flex items-center justify-between py-4">
                  <Link href={`/exclusion-lists/${list.id}?type=${activeTab}`} className="text-sm font-medium hover:underline">{list.name}</Link>
                  <ConfirmDialog
                    trigger={
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    }
                    title={`Delete "${list.name}"?`}
                    description="This will permanently delete this exclusion list."
                    confirmLabel="Delete"
                    onConfirm={() => handleDelete(list.id)}
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
