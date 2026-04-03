import Link from "next/link";
import { Building2, Users, Clock, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatNumber } from "@/lib/utils";

interface AudienceCardProps {
  audienceId: string;
  name: string;
  status: string;
  companiesCount?: number | null;
  prospectsCount?: number | null;
  createdAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive"; icon: React.ElementType }> = {
  NORMAL: { label: "Ready", variant: "secondary", icon: CheckCircle },
  BUILDING: { label: "Building", variant: "default", icon: Loader2 },
  SAVING_COMPANIES: { label: "Saving Companies", variant: "default", icon: Loader2 },
  SAVING_PROSPECTS: { label: "Saving Prospects", variant: "default", icon: Loader2 },
  LINKING_PROSPECTS_WITH_COMPANIES: { label: "Linking", variant: "default", icon: Loader2 },
  HEALING_COMPANIES: { label: "Healing", variant: "default", icon: Loader2 },
  DRAFT: { label: "Draft", variant: "secondary", icon: Clock },
  FAILED: { label: "Failed", variant: "destructive", icon: AlertCircle },
};

export function AudienceCard({
  audienceId,
  name,
  status,
  companiesCount,
  prospectsCount,
  createdAt,
}: AudienceCardProps) {
  const statusConfig = STATUS_CONFIG[status] ?? STATUS_CONFIG.NORMAL;
  const StatusIcon = statusConfig.icon;
  const isProcessing = statusConfig.icon === Loader2;

  return (
    <Link href={`/audiences/${audienceId}`}>
      <Card className="transition-colors hover:bg-muted/50 cursor-pointer">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <CardTitle className="text-base truncate">{name}</CardTitle>
            <Badge variant={statusConfig.variant} className="text-xs shrink-0 ml-2">
              <StatusIcon className={`mr-1 h-3 w-3 ${isProcessing ? "animate-spin" : ""}`} />
              {statusConfig.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Building2 className="h-3.5 w-3.5" />
              <span>{formatNumber(companiesCount ?? 0)} companies</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              <span>{formatNumber(prospectsCount ?? 0)} prospects</span>
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Created {new Date(createdAt).toLocaleDateString()}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
