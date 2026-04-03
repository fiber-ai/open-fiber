import { Mail, Phone, Shield, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/shared/copy-button";

interface Email {
  email: string;
  type: string;
  status?: string | null;
  [key: string]: unknown;
}

interface PhoneNumber {
  number: string;
  type: string;
  [key: string]: unknown;
}

interface EnrichmentResultCardProps {
  emails: Email[];
  phoneNumbers: PhoneNumber[];
  status: string;
  error?: string | null;
}

const statusColors: Record<string, string> = {
  valid: "bg-green-100 text-green-800",
  risky: "bg-yellow-100 text-yellow-800",
  invalid: "bg-red-100 text-red-800",
  unknown: "bg-gray-100 text-gray-800",
};

const typeLabels: Record<string, string> = {
  work: "Work",
  personal: "Personal",
  generic: "Generic",
  other: "Other",
  unknown: "Unknown",
  mobile: "Mobile",
};

const statusMessages: Record<string, string> = {
  started: "Processing...",
  "live-enriching": "Live enriching profile...",
  "grabbing-contact-info": "Finding contact info...",
};

export function EnrichmentResultCard({
  emails,
  phoneNumbers,
  status,
  error,
}: EnrichmentResultCardProps) {
  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="flex items-center gap-2 pt-6">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <span className="text-sm text-destructive">{error}</span>
        </CardContent>
      </Card>
    );
  }

  if (status !== "completed") {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 pt-6">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-sm text-muted-foreground">
            {statusMessages[status] ?? "Processing..."}
          </span>
        </CardContent>
      </Card>
    );
  }

  const hasResults = emails.length > 0 || phoneNumbers.length > 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Shield className="h-4 w-4" />
          Contact Information
          {hasResults && (
            <Badge variant="secondary" className="text-xs">
              {emails.length + phoneNumbers.length} found
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasResults && (
          <p className="text-sm text-muted-foreground">
            No contact information found for this profile.
          </p>
        )}

        {/* Emails */}
        {emails.length > 0 && (
          <div className="space-y-2">
            <h4 className="flex items-center gap-1.5 text-sm font-medium">
              <Mail className="h-4 w-4" />
              Emails
            </h4>
            <div className="space-y-1.5">
              {emails.map((email) => (
                <div
                  key={email.email}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono">{email.email}</span>
                    <Badge variant="outline" className="text-xs">
                      {typeLabels[email.type] ?? email.type}
                    </Badge>
                    {email.status && (
                      <Badge className={`text-xs ${statusColors[email.status] ?? ""}`}>
                        {email.status}
                      </Badge>
                    )}
                  </div>
                  <CopyButton value={email.email} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Phone Numbers */}
        {phoneNumbers.length > 0 && (
          <div className="space-y-2">
            <h4 className="flex items-center gap-1.5 text-sm font-medium">
              <Phone className="h-4 w-4" />
              Phone Numbers
            </h4>
            <div className="space-y-1.5">
              {phoneNumbers.map((phone) => (
                <div
                  key={phone.number}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono">{phone.number}</span>
                    <Badge variant="outline" className="text-xs">
                      {typeLabels[phone.type] ?? phone.type}
                    </Badge>
                  </div>
                  <CopyButton value={phone.number} />
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
