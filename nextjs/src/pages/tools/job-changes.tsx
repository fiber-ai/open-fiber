import { useState } from "react";
import { Repeat, ArrowLeft, Trash2, Loader2, Pencil, Check, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Header } from "@/components/layout/header";
import { CreateListDialog } from "@/components/journeyman/create-list-dialog";
import { AddPeopleDialog } from "@/components/journeyman/add-people-dialog";
import { ListCard } from "@/components/journeyman/list-card";
import { PeopleTable, type JourneymanPerson } from "@/components/journeyman/people-table";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorDisplay } from "@/components/shared/error-display";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatNumber } from "@/lib/utils";

export default function JobChangesPage() {
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState(25);
  const [cursorStack, setCursorStack] = useState<string[]>([]);
  const [currentCursor, setCurrentCursor] = useState<string | null>(null);

  // Rename state
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");

  const utils = trpc.useUtils();

  // --- List-level queries ---
  const listsQuery = trpc.journeyman.getLists.useQuery(undefined, {
    staleTime: 10_000,
  });

  const createMutation = trpc.journeyman.createList.useMutation({
    onSuccess: () => {
      utils.journeyman.getLists.invalidate();
    },
  });

  const deleteMutation = trpc.journeyman.deleteList.useMutation({
    onSuccess: () => {
      utils.journeyman.getLists.invalidate();
      setSelectedListId(null);
    },
  });

  const updateMutation = trpc.journeyman.updateList.useMutation({
    onSuccess: () => {
      utils.journeyman.getLists.invalidate();
      utils.journeyman.getList.invalidate({ listId: selectedListId! });
      setIsRenaming(false);
    },
  });

  // --- Detail-level queries ---
  const listDetail = trpc.journeyman.getList.useQuery(
    { listId: selectedListId! },
    { enabled: !!selectedListId }
  );

  const peopleQuery = trpc.journeyman.getListPeople.useQuery(
    { listId: selectedListId!, pageSize, cursor: currentCursor },
    { enabled: !!selectedListId, placeholderData: (prev) => prev }
  );

  const addPeopleMutation = trpc.journeyman.addPeople.useMutation({
    onSuccess: () => {
      utils.journeyman.getListPeople.invalidate({ listId: selectedListId! });
      utils.journeyman.getList.invalidate({ listId: selectedListId! });
      utils.journeyman.getLists.invalidate();
    },
  });

  const removePeopleMutation = trpc.journeyman.removePeople.useMutation({
    onSuccess: () => {
      utils.journeyman.getListPeople.invalidate({ listId: selectedListId! });
      utils.journeyman.getList.invalidate({ listId: selectedListId! });
      utils.journeyman.getLists.invalidate();
    },
  });

  // --- Navigation helpers ---
  const handleSelectList = (listId: string) => {
    setSelectedListId(listId);
    setCursorStack([]);
    setCurrentCursor(null);
    setPageSize(25);
  };

  const handleBack = () => {
    setSelectedListId(null);
    setIsRenaming(false);
  };

  const handleNextPage = () => {
    const next = peopleOutput?.nextCursor as string | null | undefined;
    if (next) {
      setCursorStack((s) => [...s, currentCursor ?? ""]);
      setCurrentCursor(next);
    }
  };

  const handlePrevPage = () => {
    setCursorStack((s) => {
      const copy = [...s];
      const prev = copy.pop();
      setCurrentCursor(prev || null);
      return copy;
    });
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCursorStack([]);
    setCurrentCursor(null);
  };

  const handleStartRename = () => {
    setRenameValue(String(detail?.name ?? ""));
    setIsRenaming(true);
  };

  const handleConfirmRename = () => {
    if (!renameValue.trim() || !selectedListId) return;
    updateMutation.mutate({ listId: selectedListId, name: renameValue.trim() });
  };

  // --- Data ---
  const listsRaw = listsQuery.data as Record<string, unknown> | undefined;
  const listsOutput = listsRaw?.output as Record<string, unknown> | undefined;
  const lists = ((listsOutput?.jobChangesLists ?? listsOutput?.lists ?? listsOutput?.data ?? []) as Array<Record<string, unknown>>).map((l) => ({
    id: (l.id as string) ?? "",
    name: (l.name as string) ?? "Unnamed",
    createdAt: String(l.createdAt ?? ""),
    peopleCount: (l.peopleCount as number) ?? null,
    status: (l.status as string) ?? null,
  }));
  const detailRaw = listDetail.data as Record<string, unknown> | undefined;
  const detail = detailRaw?.output as Record<string, unknown> | undefined;
  const peopleRaw = peopleQuery.data as Record<string, unknown> | undefined;
  const peopleOutput = peopleRaw?.output as Record<string, unknown> | undefined;
  const people = ((peopleOutput?.people ?? peopleOutput?.data ?? peopleOutput?.profiles ?? []) as Array<Record<string, unknown>>);
  const hasNextPage = !!(peopleOutput?.nextCursor);
  const hasPrevPage = cursorStack.length > 0;

  // === LIST VIEW ===
  if (!selectedListId) {
    return (
      <div className="flex h-full flex-col">
        <Header
          title="Job Change Tracking"
          description="Monitor people for job changes"
        >
          <CreateListDialog
            onSubmit={(name) => createMutation.mutate({ name })}
            isLoading={createMutation.isPending}
          />
        </Header>

        <div className="flex-1 overflow-y-auto p-6">
          {createMutation.isError && (
            <div className="mb-4">
              <ErrorDisplay message={createMutation.error.message} />
            </div>
          )}

          {listsQuery.isLoading && <LoadingSkeleton rows={4} />}

          {listsQuery.isError && (
            <ErrorDisplay
              message={listsQuery.error.message}
              onRetry={() => listsQuery.refetch()}
            />
          )}

          {lists.length === 0 && listsQuery.isSuccess && (
            <EmptyState
              icon={Repeat}
              title="No tracking lists"
              description="Create a list and add people to track for job changes."
            >
              <CreateListDialog
                onSubmit={(name) => createMutation.mutate({ name })}
                isLoading={createMutation.isPending}
              />
            </EmptyState>
          )}

          {lists.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {lists.map((list) => (
                <ListCard
                  key={list.id}
                  listId={list.id}
                  name={list.name}
                  peopleCount={list.peopleCount}
                  createdAt={list.createdAt}
                  onClick={() => handleSelectList(list.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // === DETAIL VIEW ===
  return (
    <div className="flex h-full flex-col">
      <Header
        title={String(detail?.name ?? "Loading...")}
        description={
          detail?.createdAt
            ? `Created ${new Date(String(detail.createdAt)).toLocaleDateString()}`
            : undefined
        }
      >
        <Button variant="ghost" size="sm" onClick={handleBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        {isRenaming ? (
          <div className="flex items-center gap-2">
            <Input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              className="h-8 w-48"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleConfirmRename();
                if (e.key === "Escape") setIsRenaming(false);
              }}
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleConfirmRename}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setIsRenaming(false)}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={handleStartRename}>
            <Pencil className="mr-2 h-4 w-4" />
            Rename
          </Button>
        )}
        <AddPeopleDialog
          onSubmit={(urls) =>
            addPeopleMutation.mutate({
              listId: selectedListId,
              people: urls.map((u) => ({ linkedinUrl: u })),
            })
          }
          isLoading={addPeopleMutation.isPending}
        />
        <ConfirmDialog
          trigger={
            <Button
              variant="destructive"
              size="sm"
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete List
            </Button>
          }
          title="Delete tracking list"
          description="This will permanently delete this tracking list and stop monitoring all people in it."
          confirmLabel="Delete"
          onConfirm={() => deleteMutation.mutate({ listId: selectedListId })}
        />
      </Header>

      {/* Stats bar */}
      {detail && (
        <div className="border-b px-6 py-3">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{formatNumber((detail.peopleCount as number) ?? 0)} people tracked</span>
            {people.some((p) => p.hasChanged) && (
              <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                {people.filter((p) => p.hasChanged).length} changed on this page
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Error */}
      {peopleQuery.isError && (
        <div className="p-6">
          <ErrorDisplay
            message={peopleQuery.error.message}
            onRetry={() => peopleQuery.refetch()}
          />
        </div>
      )}

      {/* People table */}
      <div className="flex-1 overflow-y-auto p-6">
        {people.length === 0 && peopleQuery.isSuccess && !peopleQuery.isFetching && (
          <EmptyState
            icon={Repeat}
            title="No people in this list"
            description="Add people by their LinkedIn URLs to start tracking them for job changes."
          >
            <AddPeopleDialog
              onSubmit={(urls) =>
                addPeopleMutation.mutate({
                  listId: selectedListId,
                  people: urls.map((u) => ({ linkedinUrl: u })),
                })
              }
              isLoading={addPeopleMutation.isPending}
            />
          </EmptyState>
        )}

        {(people.length > 0 || peopleQuery.isLoading) && (
          <PeopleTable
            people={people as unknown as JourneymanPerson[]}
            isLoading={peopleQuery.isLoading}
            hasNextPage={hasNextPage}
            hasPrevPage={hasPrevPage}
            onNext={handleNextPage}
            onPrev={handlePrevPage}
            pageSize={pageSize}
            onPageSizeChange={handlePageSizeChange}
            onRemove={(profileId) =>
              removePeopleMutation.mutate({
                listId: selectedListId,
                profileIds: [profileId],
              })
            }
            isRemoving={removePeopleMutation.isPending}
          />
        )}
      </div>
    </div>
  );
}
