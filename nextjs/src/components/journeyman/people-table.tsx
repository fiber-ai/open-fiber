import { type ColumnDef } from "@tanstack/react-table";
import { Trash2 } from "lucide-react";
import { DataTable } from "@/components/shared/data-table";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/shared/copy-button";

export interface JourneymanPerson {
  id?: string | null;
  linkedinUrl?: string | null;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  currentTitle?: string | null;
  currentCompany?: string | null;
  previousTitle?: string | null;
  previousCompany?: string | null;
  changeDetectedAt?: string | null;
  hasChanged?: boolean | null;
}

interface PeopleTableProps {
  people: JourneymanPerson[];
  isLoading: boolean;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  onNext: () => void;
  onPrev: () => void;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  onRemove?: (linkedinUrl: string) => void;
  isRemoving?: boolean;
}

export function PeopleTable({
  people,
  isLoading,
  hasNextPage,
  hasPrevPage,
  onNext,
  onPrev,
  pageSize,
  onPageSizeChange,
  onRemove,
  isRemoving,
}: PeopleTableProps) {
  const columns: ColumnDef<JourneymanPerson, unknown>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => {
        const p = row.original;
        const displayName =
          p.name ?? ([p.firstName, p.lastName].filter(Boolean).join(" ") || "—");
        return <span className="font-medium">{displayName}</span>;
      },
    },
    {
      accessorKey: "currentTitle",
      header: "Current Role",
      cell: ({ row }) => {
        const p = row.original;
        if (!p.currentTitle && !p.currentCompany) return <span className="text-muted-foreground">—</span>;
        return (
          <div className="text-sm">
            <div>{p.currentTitle ?? "—"}</div>
            {p.currentCompany && (
              <div className="text-muted-foreground text-xs">{p.currentCompany}</div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "previousTitle",
      header: "Previous Role",
      cell: ({ row }) => {
        const p = row.original;
        if (!p.previousTitle && !p.previousCompany) return <span className="text-muted-foreground">—</span>;
        return (
          <div className="text-sm">
            <div>{p.previousTitle ?? "—"}</div>
            {p.previousCompany && (
              <div className="text-muted-foreground text-xs">{p.previousCompany}</div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "hasChanged",
      header: "Status",
      cell: ({ row }) => {
        const p = row.original;
        if (p.hasChanged) {
          return (
            <Badge variant="default" className="bg-green-600 hover:bg-green-700">
              Changed
            </Badge>
          );
        }
        return <Badge variant="secondary">Tracking</Badge>;
      },
    },
    {
      accessorKey: "changeDetectedAt",
      header: "Change Detected",
      cell: ({ row }) => {
        const d = row.original.changeDetectedAt;
        if (!d) return <span className="text-muted-foreground">—</span>;
        return <span className="text-sm">{new Date(d).toLocaleDateString()}</span>;
      },
    },
    {
      accessorKey: "linkedinUrl",
      header: "LinkedIn",
      cell: ({ row }) => {
        const url = row.original.linkedinUrl;
        if (!url) return <span className="text-muted-foreground">—</span>;
        return (
          <div className="flex items-center gap-1">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline font-mono truncate max-w-[180px]"
            >
              {url.replace("https://www.linkedin.com/in/", "")}
            </a>
            <CopyButton value={url} />
          </div>
        );
      },
    },
    ...(onRemove
      ? [
          {
            id: "actions",
            header: "",
            cell: ({ row }: { row: { original: JourneymanPerson } }) => (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(row.original.id ?? row.original.linkedinUrl ?? "");
                }}
                disabled={isRemoving}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            ),
          } as ColumnDef<JourneymanPerson, unknown>,
        ]
      : []),
  ];

  return (
    <div>
      <DataTable columns={columns} data={people} isLoading={isLoading} />
      <PaginationControls
        hasNextPage={hasNextPage}
        hasPrevPage={hasPrevPage}
        onNext={onNext}
        onPrev={onPrev}
        pageSize={pageSize}
        onPageSizeChange={onPageSizeChange}
        resultCount={people.length}
      />
    </div>
  );
}
