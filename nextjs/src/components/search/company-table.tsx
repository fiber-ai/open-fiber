import { type ColumnDef } from "@tanstack/react-table";
import {
  Building2,
  MapPin,
  Users,
  DollarSign,
  ExternalLink,
} from "lucide-react";
import { DataTable } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { formatNumber } from "@/lib/utils";

export interface CompanyRow {
  preferred_name?: string | null;
  domains?: string[] | null;
  logo_url?: string | null;
  li_description?: string | null;
  short_description?: string | null;
  location_consensus?: {
    city?: string | null;
    state_name?: string | null;
    country_name?: string | null;
  } | null;
  employee_count_consensus?: {
    gte?: number | null;
    lte?: number | null;
  } | null;
  standard_industries?: string[] | null;
  total_funding_consensus?: number | null;
  funding_stage?: string | null;
  linkedin_primary_slug?: string | null;
  tags?: string[] | null;
}

const columns: ColumnDef<CompanyRow, unknown>[] = [
  {
    id: "company",
    header: "Company",
    cell: ({ row }) => {
      const company = row.original;
      return (
        <div className="flex items-center gap-3">
          {company.logo_url ? (
            <img
              src={company.logo_url}
              alt={company.preferred_name ?? "Company logo"}
              className="h-8 w-8 rounded border object-contain"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded border bg-muted">
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate font-medium">
              {company.preferred_name ?? "Unknown"}
            </p>
            {company.domains?.[0] && (
              <p className="truncate text-xs text-muted-foreground">
                {company.domains[0]}
              </p>
            )}
          </div>
        </div>
      );
    },
    size: 250,
  },
  {
    id: "industry",
    header: "Industry",
    cell: ({ row }) => {
      const industries = row.original.standard_industries;
      if (!industries?.length) return <span className="text-muted-foreground">-</span>;
      return (
        <div className="flex flex-wrap gap-1">
          {industries.slice(0, 2).map((ind) => (
            <Badge key={ind} variant="outline" className="text-xs">
              {ind}
            </Badge>
          ))}
          {industries.length > 2 && (
            <Badge variant="outline" className="text-xs">
              +{industries.length - 2}
            </Badge>
          )}
        </div>
      );
    },
    size: 200,
  },
  {
    id: "location",
    header: "Location",
    cell: ({ row }) => {
      const loc = row.original.location_consensus;
      if (!loc) return <span className="text-muted-foreground">-</span>;
      const parts = [loc.city, loc.state_name, loc.country_name].filter(Boolean);
      return (
        <div className="flex items-center gap-1">
          <MapPin className="h-3 w-3 text-muted-foreground" />
          <span className="truncate text-sm">{parts.join(", ")}</span>
        </div>
      );
    },
    size: 200,
  },
  {
    id: "employees",
    header: "Employees",
    cell: ({ row }) => {
      const emp = row.original.employee_count_consensus;
      if (!emp) return <span className="text-muted-foreground">-</span>;
      const gte = emp.gte ?? 0;
      const lte = emp.lte ?? gte;
      return (
        <div className="flex items-center gap-1">
          <Users className="h-3 w-3 text-muted-foreground" />
          <span className="text-sm">
            {gte === lte ? formatNumber(gte) : `${formatNumber(gte)}-${formatNumber(lte)}`}
          </span>
        </div>
      );
    },
    size: 120,
  },
  {
    id: "funding",
    header: "Funding",
    cell: ({ row }) => {
      const funding = row.original.total_funding_consensus;
      const stage = row.original.funding_stage;
      return (
        <div className="space-y-0.5">
          {funding ? (
            <div className="flex items-center gap-1">
              <DollarSign className="h-3 w-3 text-muted-foreground" />
              <span className="text-sm">{formatFunding(funding)}</span>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">-</span>
          )}
          {stage && (
            <Badge variant="secondary" className="text-xs">
              {formatStage(stage)}
            </Badge>
          )}
        </div>
      );
    },
    size: 150,
  },
  {
    id: "linkedin",
    header: "",
    cell: ({ row }) => {
      const slug = row.original.linkedin_primary_slug;
      if (!slug) return null;
      return (
        <a
          href={`https://www.linkedin.com/company/${slug}`}
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

interface CompanyTableProps {
  data: CompanyRow[];
  isLoading?: boolean;
  onRowClick?: (row: CompanyRow) => void;
}

export function CompanyTable({ data, isLoading, onRowClick }: CompanyTableProps) {
  return (
    <DataTable
      columns={columns}
      data={data}
      isLoading={isLoading}
      onRowClick={onRowClick}
    />
  );
}

function formatFunding(amount: number): string {
  if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount}`;
}

function formatStage(stage: string): string {
  return stage
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
