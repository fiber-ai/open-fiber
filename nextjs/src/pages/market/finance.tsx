import { useState } from "react";
import { TrendingUp, TrendingDown, Loader2, LineChart } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorDisplay } from "@/components/shared/error-display";
import { EmptyState } from "@/components/shared/empty-state";

type Row = Record<string, unknown>;
type InstrumentType = "stockOrEtf" | "index" | "mutualFund" | "currencyPair" | "customSymbol";

const INDICES = [
  { value: "SP_500", label: "S&P 500" },
  { value: "DOW_JONES", label: "Dow Jones" },
  { value: "NASDAQ_100", label: "Nasdaq 100" },
  { value: "NASDAQ_COMPOSITE", label: "Nasdaq Composite" },
  { value: "RUSSELL_1000", label: "Russell 1000" },
  { value: "RUSSELL_2000", label: "Russell 2000" },
  { value: "RUSSELL_3000", label: "Russell 3000" },
  { value: "FTSE_100", label: "FTSE 100" },
] as const;

const WINDOWS = ["1D", "5D", "1M", "6M", "YTD", "1Y", "5Y", "MAX"] as const;

const KEY_STAT_LABELS: Record<string, string> = {
  open: "Open", high: "High", low: "Low", marketCap: "Market Cap",
  volume: "Volume", averageVolume: "Avg Volume", peRatio: "P/E Ratio",
  dividendYieldPercentage: "Dividend Yield %", fiftyTwoWeekHigh: "52W High",
  fiftyTwoWeekLow: "52W Low", earningsPerShare: "EPS", beta: "Beta",
  sharesOutstanding: "Shares Outstanding",
};

function formatStat(key: string, v: number): string {
  if (key === "marketCap" || key === "sharesOutstanding") {
    if (v >= 1e12) return `${(v / 1e12).toFixed(2)}T`;
    if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
    if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
  }
  return v.toLocaleString();
}

export default function FinancePage() {
  const [type, setType] = useState<InstrumentType>("stockOrEtf");
  const [ticker, setTicker] = useState("");
  const [exchange, setExchange] = useState("NASDAQ");
  const [index, setIndex] = useState<(typeof INDICES)[number]["value"]>("SP_500");
  const [base, setBase] = useState("USD");
  const [quoteCurrency, setQuoteCurrency] = useState("EUR");
  const [symbol, setSymbol] = useState("");
  const [window, setWindow] = useState<(typeof WINDOWS)[number]>("1D");

  const mutation = trpc.finance.lookupInstrument.useMutation();

  const canSubmit = (() => {
    switch (type) {
      case "stockOrEtf": return !!ticker.trim() && !!exchange.trim();
      case "mutualFund": return !!ticker.trim();
      case "index": return true;
      case "currencyPair": return !!base.trim() && !!quoteCurrency.trim();
      case "customSymbol": return !!symbol.trim();
    }
  })();

  const handleSubmit = () => {
    if (!canSubmit) return;
    const instrument = (() => {
      switch (type) {
        case "stockOrEtf": return { type, ticker: ticker.trim().toUpperCase(), exchange: exchange.trim().toUpperCase() };
        case "mutualFund": return { type, ticker: ticker.trim().toUpperCase() };
        case "index": return { type, index };
        case "currencyPair": return { type, base: base.trim().toUpperCase(), quote: quoteCurrency.trim().toUpperCase() };
        case "customSymbol": return { type, symbol: symbol.trim() };
      }
    })();
    mutation.mutate({ instrument, window });
  };

  const out = mutation.data?.output as Row | undefined;
  const instrument = out?.instrument as Row | undefined;
  const quote = out?.quote as Row | undefined;
  const priceChange = quote?.priceChange as Row | undefined;
  const keyStats = out?.keyStats as Row | undefined;
  const companyInfo = out?.companyInfo as Row | undefined;
  const isUp = priceChange?.direction === "up";

  return (
    <div className="flex h-full flex-col">
      <Header icon={LineChart} title="Finance" description="Look up quotes and key stats for stocks, ETFs, indices, funds, and currency pairs" />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-3xl space-y-6">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Instrument type</Label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as InstrumentType)}
                    className="block rounded-md border bg-background px-2 py-1.5 text-sm"
                  >
                    <option value="stockOrEtf">Stock / ETF</option>
                    <option value="index">Index</option>
                    <option value="mutualFund">Mutual Fund</option>
                    <option value="currencyPair">Currency Pair</option>
                    <option value="customSymbol">Custom Symbol</option>
                  </select>
                </div>

                {(type === "stockOrEtf" || type === "mutualFund") && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Ticker</Label>
                    <Input className="w-28" placeholder="AAPL" value={ticker} onChange={(e) => setTicker(e.target.value)} />
                  </div>
                )}
                {type === "stockOrEtf" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Exchange</Label>
                    <Input className="w-28" placeholder="NASDAQ" value={exchange} onChange={(e) => setExchange(e.target.value)} />
                  </div>
                )}
                {type === "index" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Index</Label>
                    <select
                      value={index}
                      onChange={(e) => setIndex(e.target.value as typeof index)}
                      className="block rounded-md border bg-background px-2 py-1.5 text-sm"
                    >
                      {INDICES.map((i) => <option key={i.value} value={i.value}>{i.label}</option>)}
                    </select>
                  </div>
                )}
                {type === "currencyPair" && (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Base</Label>
                      <Input className="w-20" placeholder="USD" value={base} onChange={(e) => setBase(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Quote</Label>
                      <Input className="w-20" placeholder="EUR" value={quoteCurrency} onChange={(e) => setQuoteCurrency(e.target.value)} />
                    </div>
                  </>
                )}
                {type === "customSymbol" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Symbol</Label>
                    <Input className="w-40" placeholder="e.g. BTC-USD" value={symbol} onChange={(e) => setSymbol(e.target.value)} />
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label className="text-xs">Window</Label>
                  <select
                    value={window}
                    onChange={(e) => setWindow(e.target.value as typeof window)}
                    className="block rounded-md border bg-background px-2 py-1.5 text-sm"
                  >
                    {WINDOWS.map((w) => <option key={w} value={w}>{w}</option>)}
                  </select>
                </div>
              </div>

              <Button onClick={handleSubmit} disabled={!canSubmit || mutation.isPending}>
                {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LineChart className="mr-2 h-4 w-4" />}
                Look Up
              </Button>
            </CardContent>
          </Card>

          {mutation.isError && <ErrorDisplay message={mutation.error.message} />}

          {out && (
            <div className="space-y-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-lg font-semibold">{(instrument?.name as string) ?? (instrument?.ticker as string) ?? "Instrument"}</h2>
                      <p className="text-xs text-muted-foreground">
                        {[instrument?.ticker, instrument?.exchange].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    {typeof quote?.price === "number" && (
                      <div className="text-right">
                        <p className="text-3xl font-semibold">
                          {(quote.price as number).toLocaleString()} <span className="text-sm font-normal text-muted-foreground">{quote.currency as string}</span>
                        </p>
                        {priceChange && typeof priceChange.amount === "number" && (
                          <p className={`flex items-center justify-end gap-1 text-sm ${isUp ? "text-emerald-600" : "text-red-600"}`}>
                            {isUp ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                            {(priceChange.amount as number).toLocaleString()}
                            {typeof priceChange.percentage === "number" && ` (${(priceChange.percentage as number).toFixed(2)}%)`}
                            <span className="text-muted-foreground font-normal">· {window}</span>
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {keyStats && (
                <Card>
                  <CardHeader><CardTitle className="text-base">Key Stats</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
                      {Object.entries(KEY_STAT_LABELS)
                        .filter(([k]) => typeof keyStats[k] === "number")
                        .map(([k, label]) => (
                          <div key={k} className="flex justify-between border-b pb-1 text-sm">
                            <span className="text-muted-foreground">{label}</span>
                            <span className="font-mono">{formatStat(k, keyStats[k] as number)}</span>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {companyInfo && (companyInfo.description as string) && (
                <Card>
                  <CardHeader><CardTitle className="text-base">About</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm whitespace-pre-wrap">{companyInfo.description as string}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {(companyInfo.ceoName as string) && <span>CEO: {companyInfo.ceoName as string}</span>}
                      {typeof companyInfo.employeeCount === "number" && <span>{(companyInfo.employeeCount as number).toLocaleString()} employees</span>}
                      {(companyInfo.headquarters as string) && <span>{companyInfo.headquarters as string}</span>}
                      {(companyInfo.sector as string) && <span>{companyInfo.sector as string}</span>}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {!mutation.data && !mutation.isPending && !mutation.isError && (
            <EmptyState icon={LineChart} title="Financial instrument lookup" description="Quotes, key stats, and company info for any tradable instrument." />
          )}
        </div>
      </div>
    </div>
  );
}
