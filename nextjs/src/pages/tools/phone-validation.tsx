import { useState } from "react";
import { Phone, ShieldCheck } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorDisplay } from "@/components/shared/error-display";
import { useCreditCosts } from "@/hooks/use-credit-costs";

const STATUS_COLORS: Record<string, string> = {
  valid_reachable: "bg-green-100 text-green-800",
  valid_not_reachable: "bg-yellow-100 text-yellow-800",
  invalid: "bg-red-100 text-red-800",
  unknown: "bg-gray-100 text-gray-800",
};

interface PhoneResult {
  formattedNumber?: string | null;
  nationalFormat?: string | null;
  countryName?: string | null;
  countryIsoCode?: string | null;
  isValid: boolean;
  isReachable: string;
  isPorted: boolean;
  isRoaming: boolean;
  validationScore: number;
  validationStatus: string;
  callerIdName?: string | null;
  currentCarrier?: { name?: string | null; networkType?: string | null } | null;
}

export default function PhoneValidationPage() {
  const [phone, setPhone] = useState("");
  const costs = useCreditCosts();

  const validate = trpc.validation.validatePhoneNumber.useMutation();
  const result = validate.data;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.trim()) validate.mutate({ phoneNumber: phone.trim() });
  };

  return (
    <div className="flex h-full flex-col">
      <Header title="Phone Validation" description={`Verify phone numbers (${costs.validatePhone} credits)`} />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-lg space-y-6">
          <Card>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <Input
                    placeholder="+14155551234"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">E.164 format recommended (e.g. +14155551234)</p>
                </div>
                <Button type="submit" disabled={!phone.trim() || validate.isPending} className="w-full">
                  {validate.isPending ? (
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <Phone className="mr-2 h-4 w-4" />
                  )}
                  Validate Phone
                </Button>
              </form>
            </CardContent>
          </Card>

          {validate.isError && <ErrorDisplay message={validate.error.message} />}

          {result?.output && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Phone className="h-4 w-4" />
                  {result.output.formattedNumber ?? phone}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Badge className={`text-sm ${STATUS_COLORS[result.output.validationStatus] ?? ""}`}>
                    {result.output.validationStatus.replace(/_/g, " ").toUpperCase()}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    Score: {result.output.validationScore}/10
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center justify-between rounded-md border px-3 py-2">
                    <span>Valid</span>
                    <Badge variant={result.output.isValid ? "default" : "destructive"} className="text-xs">
                      {result.output.isValid ? "Yes" : "No"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between rounded-md border px-3 py-2">
                    <span>Reachable</span>
                    <Badge variant={result.output.isReachable === "reachable" ? "default" : "secondary"} className="text-xs">
                      {result.output.isReachable}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between rounded-md border px-3 py-2">
                    <span>Ported</span>
                    <Badge variant="secondary" className="text-xs">
                      {result.output.isPorted ? "Yes" : "No"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between rounded-md border px-3 py-2">
                    <span>Roaming</span>
                    <Badge variant="secondary" className="text-xs">
                      {result.output.isRoaming ? "Yes" : "No"}
                    </Badge>
                  </div>
                </div>

                {result.output.countryName && (
                  <p className="text-sm text-muted-foreground">Country: {result.output.countryName}</p>
                )}
                {result.output.callerIdName && (
                  <p className="text-sm text-muted-foreground">Caller ID: {result.output.callerIdName}</p>
                )}
                {result.output.currentCarrier?.name && (
                  <p className="text-sm text-muted-foreground">
                    Carrier: {result.output.currentCarrier.name}
                    {result.output.currentCarrier.networkType && ` (${result.output.currentCarrier.networkType})`}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {!result && !validate.isPending && !validate.isError && (
            <EmptyState icon={Phone} title="Phone Validation" description="Enter a phone number to verify its validity and reachability." />
          )}
        </div>
      </div>
    </div>
  );
}
