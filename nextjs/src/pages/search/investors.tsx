import { useState } from "react";
import { Landmark } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorDisplay } from "@/components/shared/error-display";

interface Investor {
  name?: string | null;
  totalInvestmentCount: number;
  leadInvestmentCount: number;
  leadInvestmentRate: number;
  lastInvestmentDate?: string | null;
  type?: string | null;
  types?: string[] | null;
  isTopVc?: boolean | null;
  domain?: string | null;
  countryCode?: string | null;
}

export default function InvestorSearchPage() {
  const [country, setCountry] = useState("USA");
  const [investorType, setInvestorType] = useState<string>("either");
  const [minInvestments, setMinInvestments] = useState<string>("5");

  const searchMutation = trpc.search.investorSearch.useMutation();

  const handleSearch = () => {
    const searchParams: Record<string, unknown> = {};
    if (country.trim()) searchParams.countryCode = { anyOf: country.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean) };
    if (investorType !== "either") searchParams.investorType = investorType;
    const min = parseInt(minInvestments);
    if (!isNaN(min) && min > 0) searchParams.numInvestments = { lowerBound: min };
    searchMutation.mutate({ searchParams, pageSize: 50 });
  };

  const result = searchMutation.data;
  const investors = result?.output?.investors ?? [];

  return (
    <div className="flex h-full flex-col">
      <Header title="Investor Search" description="Find investors by country, type, and activity" />

      <div className="border-b p-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Country</Label>
            <Input placeholder="e.g. USA, GBR" value={country} onChange={(e) => setCountry(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Investor Type</Label>
            <select className="w-full rounded-md border bg-background px-2 py-2 text-sm" value={investorType} onChange={(e) => setInvestorType(e.target.value)}>
              <option value="either">All Types</option>
              <option value="person">Person</option>
              <option value="organization">Organization</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Min. Investments</Label>
            <Input type="number" placeholder="e.g. 5" value={minInvestments} onChange={(e) => setMinInvestments(e.target.value)} />
          </div>
        </div>
        <Button className="mt-3" onClick={handleSearch} disabled={searchMutation.isPending}>
          {searchMutation.isPending ? (
            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <Landmark className="mr-2 h-4 w-4" />
          )}
          Search Investors
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {searchMutation.isError && (
          <div className="p-6"><ErrorDisplay message={searchMutation.error.message} /></div>
        )}

        {investors.length > 0 && (
          <div className="p-4">
            <div className="rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-2 text-left font-medium">Investor</th>
                    <th className="px-4 py-2 text-left font-medium">Type</th>
                    <th className="px-4 py-2 text-right font-medium">Total</th>
                    <th className="px-4 py-2 text-right font-medium">Lead</th>
                    <th className="px-4 py-2 text-right font-medium">Lead Rate</th>
                    <th className="px-4 py-2 text-left font-medium">Last Investment</th>
                  </tr>
                </thead>
                <tbody>
                  {investors.map((inv, i) => (
                    <tr key={i} className="border-b">
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{inv.name ?? "Unknown"}</span>
                          {inv.isTopVc && <Badge className="text-xs bg-amber-100 text-amber-800">Top VC</Badge>}
                        </div>
                        {inv.domain && <p className="text-xs text-muted-foreground">{inv.domain}</p>}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex flex-wrap gap-1">
                          {inv.type && <Badge variant="outline" className="text-xs">{inv.type}</Badge>}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-right font-mono">{inv.totalInvestmentCount}</td>
                      <td className="px-4 py-2 text-right font-mono">{inv.leadInvestmentCount}</td>
                      <td className="px-4 py-2 text-right font-mono">{(inv.leadInvestmentRate * 100).toFixed(0)}%</td>
                      <td className="px-4 py-2 text-muted-foreground">{inv.lastInvestmentDate ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {searchMutation.isSuccess && investors.length === 0 && (
          <EmptyState icon={Landmark} title="No investors found" description="Try different filters." />
        )}
        {!searchMutation.isSuccess && !searchMutation.isPending && !searchMutation.isError && (
          <EmptyState icon={Landmark} title="Investor Search" description="Search for investors by country and type to see their activity." />
        )}
      </div>
    </div>
  );
}
