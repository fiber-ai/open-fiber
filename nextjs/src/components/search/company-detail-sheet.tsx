import {
  MapPin,
  Users,
  DollarSign,
  Globe,
  ExternalLink,
  Briefcase,
  Calendar,
  Tag,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { FiberAvatar } from "@/components/shared/fiber-avatar";
import { formatNumber } from "@/lib/utils";
import type { CompanyRow } from "./company-table";

interface CompanyDetailSheetProps {
  company: CompanyRow & {
    li_description?: string | null;
    short_description?: string | null;
    long_description?: string | null;
    founded_on_consensus?: string | null;
    revenue_usd?: number | null;
    best_funding_round?: {
      round_type?: string | null;
      announced_on_date?: string | null;
      raised_amount_usd?: number | null;
    } | null;
    investors?: Array<{
      investor_name?: string | null;
    }> | null;
    li_specialties?: string[] | null;
    websites?: string[] | null;
    emails?: string[] | null;
    phone_numbers?: string[] | null;
  };
  onClose: () => void;
}

export function CompanyDetailSheet({ company, onClose }: CompanyDetailSheetProps) {
  const description =
    company.short_description ?? company.li_description ?? company.long_description;
  const loc = company.location_consensus;
  const locationStr = loc
    ? [loc.city, loc.state_name, loc.country_name].filter(Boolean).join(", ")
    : null;
  const emp = company.employee_count_consensus;
  const empStr = emp
    ? emp.gte === emp.lte
      ? formatNumber(emp.gte ?? 0)
      : `${formatNumber(emp.gte ?? 0)}-${formatNumber(emp.lte ?? 0)}`
    : null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l bg-background shadow-xl">
      {/* Header */}
      <div className="flex items-start justify-between p-6">
        <div className="flex items-center gap-3">
          <FiberAvatar
            src={company.logo_url}
            alt={company.preferred_name ?? "Company logo"}
            type="company"
            size="lg"
          />
          <div>
            <h2 className="text-lg font-semibold">
              {company.preferred_name ?? "Unknown"}
            </h2>
            {company.domains?.[0] && (
              <a
                href={`https://${company.domains[0]}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                <Globe className="h-3 w-3" />
                {company.domains[0]}
              </a>
            )}
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          ✕
        </Button>
      </div>

      <Separator />

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4">
          {locationStr && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{locationStr}</span>
            </div>
          )}
          {empStr && (
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{empStr} employees</span>
            </div>
          )}
          {company.total_funding_consensus && (
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                {formatFunding(company.total_funding_consensus)} raised
              </span>
            </div>
          )}
          {company.founded_on_consensus && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Founded {company.founded_on_consensus}</span>
            </div>
          )}
          {company.funding_stage && (
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <Badge variant="secondary" className="text-xs">
                {company.funding_stage.replace(/_/g, " ")}
              </Badge>
            </div>
          )}
        </div>

        {/* Industries */}
        {company.standard_industries && company.standard_industries.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-medium">Industries</h3>
            <div className="flex flex-wrap gap-1">
              {company.standard_industries.map((ind) => (
                <Badge key={ind} variant="outline" className="text-xs">
                  {ind}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Tags */}
        {company.tags && company.tags.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-medium">Tags</h3>
            <div className="flex flex-wrap gap-1">
              {company.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  <Tag className="mr-1 h-3 w-3" />
                  {tag.replace(/-/g, " ")}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Investors */}
        {company.investors && company.investors.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-medium">Investors</h3>
            <div className="flex flex-wrap gap-1">
              {company.investors.map((inv, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {inv.investor_name ?? "Unknown"}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Contact */}
        {(company.emails?.length || company.phone_numbers?.length || company.websites?.length) && (
          <div>
            <h3 className="mb-2 text-sm font-medium">Contact</h3>
            <div className="space-y-1 text-sm">
              {company.emails?.map((email) => (
                <p key={email} className="text-muted-foreground">{email}</p>
              ))}
              {company.phone_numbers?.map((phone) => (
                <p key={phone} className="text-muted-foreground">{phone}</p>
              ))}
            </div>
          </div>
        )}

        {/* LinkedIn Link */}
        {company.linkedin_primary_slug && (
          <a
            href={`https://www.linkedin.com/company/${company.linkedin_primary_slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <ExternalLink className="h-4 w-4" />
            View on LinkedIn
          </a>
        )}
      </div>
    </div>
  );
}

function formatFunding(amount: number): string {
  if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount}`;
}
