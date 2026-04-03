import { useState } from "react";
import { ShieldCheck, Mail } from "lucide-react";
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

const VERDICT_COLORS: Record<string, string> = {
  ok: "bg-green-100 text-green-800",
  undeliverable: "bg-red-100 text-red-800",
  risky: "bg-yellow-100 text-yellow-800",
  inconclusive: "bg-gray-100 text-gray-800",
};


export default function EmailValidationPage() {
  const [email, setEmail] = useState("");
  const costs = useCreditCosts();

  const validate = trpc.validation.emailBounceDetection.useMutation();
  const result = validate.data;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) validate.mutate({ email: email.trim() });
  };

  return (
    <div className="flex h-full flex-col">
      <Header title="Email Validation" description={`Check deliverability and detect bounces (${costs.validateEmail} credits)`} />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-lg space-y-6">
          <Card>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <Input
                    type="email"
                    placeholder="john@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <Button type="submit" disabled={!email.trim() || validate.isPending} className="w-full">
                  {validate.isPending ? (
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <ShieldCheck className="mr-2 h-4 w-4" />
                  )}
                  Validate Email
                </Button>
              </form>
            </CardContent>
          </Card>

          {validate.isError && <ErrorDisplay message={validate.error.message} />}

          {result?.output && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Mail className="h-4 w-4" />
                  {result.output.email}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Badge className={`text-sm ${VERDICT_COLORS[result.output.verdict] ?? ""}`}>
                    {result.output.verdict.toUpperCase()}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    Score: {result.output.deliverability_score}/100
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center justify-between rounded-md border px-3 py-2">
                    <span>Catch-all</span>
                    <Badge variant={result.output.is_catch_all ? "destructive" : "secondary"} className="text-xs">
                      {result.output.is_catch_all ? "Yes" : "No"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between rounded-md border px-3 py-2">
                    <span>Role-based</span>
                    <Badge variant={result.output.is_role_based ? "default" : "secondary"} className="text-xs">
                      {result.output.is_role_based ? "Yes" : "No"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between rounded-md border px-3 py-2">
                    <span>Disposable</span>
                    <Badge variant={result.output.is_disposable ? "destructive" : "secondary"} className="text-xs">
                      {result.output.is_disposable ? "Yes" : "No"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between rounded-md border px-3 py-2">
                    <span>Consumer</span>
                    <Badge variant="secondary" className="text-xs">
                      {result.output.is_consumer ? "Yes" : "No"}
                    </Badge>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  Provider: {result.output.email_provider}
                </p>
              </CardContent>
            </Card>
          )}

          {!result && !validate.isPending && !validate.isError && (
            <EmptyState icon={ShieldCheck} title="Email Validation" description="Enter an email address to check its deliverability." />
          )}
        </div>
      </div>
    </div>
  );
}
