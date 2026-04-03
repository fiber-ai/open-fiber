import { type ColumnDef } from "@tanstack/react-table";
import { User, MapPin, Briefcase, ExternalLink } from "lucide-react";
import { DataTable } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";

export interface ProspectRow {
  name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  headline?: string | null;
  profile_pic?: string | null;
  primary_slug?: string | null;
  current_job?: {
    title?: string | null;
    company_name?: string | null;
    seniority?: string | null;
  } | null;
  inferred_location?: {
    city?: string | null;
    state_name?: string | null;
    country_name?: string | null;
  } | null;
  locality?: string | null;
  industry_name?: string | null;
  tags?: string[] | null;
  connection_count?: number | null;
  open_to_work?: boolean | null;
  is_hiring?: boolean | null;
}

const columns: ColumnDef<ProspectRow, unknown>[] = [
  {
    id: "person",
    header: "Person",
    cell: ({ row }) => {
      const p = row.original;
      const displayName = p.name ?? ([p.first_name, p.last_name].filter(Boolean).join(" ") || "Unknown");
      return (
        <div className="flex items-center gap-3">
          {p.profile_pic ? (
            <img
              src={p.profile_pic}
              alt={displayName}
              className="h-8 w-8 rounded-full border object-cover"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full border bg-muted">
              <User className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate font-medium">{displayName}</p>
            {p.headline && (
              <p className="truncate text-xs text-muted-foreground">{p.headline}</p>
            )}
          </div>
        </div>
      );
    },
    size: 280,
  },
  {
    id: "title",
    header: "Title & Company",
    cell: ({ row }) => {
      const job = row.original.current_job;
      if (!job?.title && !job?.company_name)
        return <span className="text-muted-foreground">-</span>;
      return (
        <div className="min-w-0">
          {job?.title && (
            <div className="flex items-center gap-1">
              <Briefcase className="h-3 w-3 shrink-0 text-muted-foreground" />
              <span className="truncate text-sm">{job.title}</span>
            </div>
          )}
          {job?.company_name && (
            <p className="truncate text-xs text-muted-foreground">{job.company_name}</p>
          )}
        </div>
      );
    },
    size: 220,
  },
  {
    id: "location",
    header: "Location",
    cell: ({ row }) => {
      const loc = row.original.inferred_location;
      const locality = row.original.locality;
      if (!loc && !locality) return <span className="text-muted-foreground">-</span>;
      const parts = loc
        ? [loc.city, loc.state_name, loc.country_name].filter(Boolean)
        : [locality].filter(Boolean);
      return (
        <div className="flex items-center gap-1">
          <MapPin className="h-3 w-3 text-muted-foreground" />
          <span className="truncate text-sm">{parts.join(", ")}</span>
        </div>
      );
    },
    size: 180,
  },
  {
    id: "tags",
    header: "Tags",
    cell: ({ row }) => {
      const tags = row.original.tags;
      if (!tags?.length) {
        const badges: React.ReactNode[] = [];
        if (row.original.open_to_work)
          badges.push(
            <Badge key="otw" variant="default" className="text-xs bg-green-600">
              Open to Work
            </Badge>
          );
        if (row.original.is_hiring)
          badges.push(
            <Badge key="hiring" variant="default" className="text-xs bg-blue-600">
              Hiring
            </Badge>
          );
        return badges.length > 0 ? (
          <div className="flex flex-wrap gap-1">{badges}</div>
        ) : (
          <span className="text-muted-foreground">-</span>
        );
      }
      return (
        <div className="flex flex-wrap gap-1">
          {tags.slice(0, 2).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag.replace(/-/g, " ")}
            </Badge>
          ))}
          {tags.length > 2 && (
            <Badge variant="outline" className="text-xs">
              +{tags.length - 2}
            </Badge>
          )}
        </div>
      );
    },
    size: 180,
  },
  {
    id: "linkedin",
    header: "",
    cell: ({ row }) => {
      const slug = row.original.primary_slug;
      if (!slug) return null;
      return (
        <a
          href={`https://www.linkedin.com/in/${slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-foreground"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      );
    },
    size: 50,
  },
];

interface ProspectTableProps {
  data: ProspectRow[];
  isLoading?: boolean;
  onRowClick?: (row: ProspectRow) => void;
}

export function ProspectTable({ data, isLoading, onRowClick }: ProspectTableProps) {
  return (
    <DataTable columns={columns} data={data} isLoading={isLoading} onRowClick={onRowClick} />
  );
}
