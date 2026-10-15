import { useState } from "react";
import { cn } from "@/lib/utils";

type Row = Record<string, unknown>;
const PALETTE = ["#0ea5e9", "#8b5cf6", "#f59e0b", "#10b981", "#ef4444", "#ec4899", "#14b8a6", "#6366f1", "#84cc16", "#f97316"];

/**
 * Sankey-style flow: company buckets on one side, the analysed company on the other,
 * ribbons sized by headcount. Joiners flow in from the left; leavers flow out to the right.
 */
export function FlowDiagram({ companyName, buckets, direction, total }: { companyName: string; buckets: Row[]; direction: "joiners" | "leavers"; total: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const top = buckets.slice(0, 10).map((b) => ({ name: b.companyName as string, count: (b.count as number) ?? 0, stage: b.stage as string | null }));
  const shown = top.reduce((n, b) => n + b.count, 0);
  const other = Math.max(0, total - shown);
  const nodes = other > 0 ? [...top, { name: "Everywhere else", count: other, stage: null }] : top;
  if (nodes.length === 0) return null;

  const W = 900, rowH = 34, gap = 6, H = nodes.length * rowH;
  const sum = nodes.reduce((n, b) => n + b.count, 0) || 1;
  const centerH = Math.min(H - 20, Math.max(80, H * 0.7));
  const centerY = (H - centerH) / 2;
  const sideX = direction === "joiners" ? 250 : W - 260;
  const centerX = direction === "joiners" ? W - 210 : 200;
  const nodeW = 10;

  let cursor = centerY;
  const ribbons = nodes.map((n, i) => {
    const sideH = Math.max(3, (n.count / Math.max(...nodes.map((x) => x.count))) * (rowH - gap));
    const sy = i * rowH + (rowH - sideH) / 2;
    const ch = (n.count / sum) * centerH;
    const cy = cursor;
    cursor += ch;
    const [x1, x2] = direction === "joiners" ? [sideX + nodeW, centerX] : [centerX + nodeW, sideX];
    const [y1a, y1b, y2a, y2b] = direction === "joiners" ? [sy, sy + sideH, cy, cy + ch] : [cy, cy + ch, sy, sy + sideH];
    const mx = (x1 + x2) / 2;
    const d = `M${x1},${y1a} C${mx},${y1a} ${mx},${y2a} ${x2},${y2a} L${x2},${y2b} C${mx},${y2b} ${mx},${y1b} ${x1},${y1b} Z`;
    return { n, i, d, sy, sideH, color: i === nodes.length - 1 && other > 0 ? "#94a3b8" : PALETTE[i % PALETTE.length] };
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`${direction} flow diagram`}>
      {ribbons.map((r) => (
        <path key={r.i} d={r.d} fill={r.color} className="transition-opacity" opacity={hover == null ? 0.35 : hover === r.i ? 0.7 : 0.08}
          onMouseEnter={() => setHover(r.i)} onMouseLeave={() => setHover(null)}>
          <title>{`${r.n.name}: ${r.n.count.toLocaleString()} (${((r.n.count / sum) * 100).toFixed(1)}%)`}</title>
        </path>
      ))}
      {ribbons.map((r) => (
        <g key={`n${r.i}`} onMouseEnter={() => setHover(r.i)} onMouseLeave={() => setHover(null)} className="cursor-default">
          <rect x={sideX} y={r.sy} width={nodeW} height={r.sideH} fill={r.color} rx={2} />
          <text
            x={direction === "joiners" ? sideX - 8 : sideX + nodeW + 8}
            y={r.i * rowH + rowH / 2 + 4}
            textAnchor={direction === "joiners" ? "end" : "start"}
            className={cn("fill-foreground text-[12px]", hover === r.i && "font-semibold")}
          >
            {r.n.name.length > 30 ? `${r.n.name.slice(0, 29)}…` : r.n.name}
            <tspan className="fill-muted-foreground"> {r.n.count.toLocaleString()}</tspan>
          </text>
        </g>
      ))}
      <rect x={centerX} y={centerY} width={nodeW} height={centerH} className="fill-foreground" rx={2} />
      <text x={direction === "joiners" ? centerX + nodeW + 10 : centerX - 10} y={H / 2 - 4} textAnchor={direction === "joiners" ? "start" : "end"} className="fill-foreground text-[14px] font-semibold">{companyName}</text>
      <text x={direction === "joiners" ? centerX + nodeW + 10 : centerX - 10} y={H / 2 + 14} textAnchor={direction === "joiners" ? "start" : "end"} className="fill-muted-foreground text-[11px]">{total.toLocaleString()} {direction}</text>
    </svg>
  );
}

interface Dist { count: number; median?: number | null; p25?: number | null; p75?: number | null; min?: number | null; max?: number | null; mean?: number | null }

/** Horizontal box plot (min–p25–median–p75–max). */
export function BoxPlot({ label, d, unit, fmt = (v: number) => v.toFixed(1) }: { label: string; d?: Dist | null; unit: string; fmt?: (v: number) => string }) {
  if (!d || d.median == null || d.min == null || d.max == null) return null;
  const lo = d.min, hi = Math.max(d.max, lo + 1);
  const pos = (v: number | null | undefined) => `${(((v ?? lo) - lo) / (hi - lo)) * 100}%`;
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-sm"><span className="text-lg font-semibold tabular-nums">{fmt(d.median)}</span> <span className="text-muted-foreground">{unit} median</span></span>
      </div>
      <div className="relative h-8">
        <div className="absolute inset-x-0 top-1/2 h-px bg-border" />
        <div className="absolute top-1/2 h-3 w-px -translate-y-1/2 bg-muted-foreground" style={{ left: pos(d.min) }} />
        <div className="absolute top-1/2 h-3 w-px -translate-y-1/2 bg-muted-foreground" style={{ left: pos(d.max) }} />
        <div className="absolute top-1 h-6 rounded-sm border border-primary/60 bg-primary/15" style={{ left: pos(d.p25), width: `calc(${pos(d.p75)} - ${pos(d.p25)})` }} />
        <div className="absolute top-0.5 h-7 w-0.5 bg-primary" style={{ left: pos(d.median) }} />
      </div>
      <div className="flex justify-between text-[11px] tabular-nums text-muted-foreground">
        <span>min {fmt(d.min)}</span>
        {d.p25 != null && d.p75 != null && <span>middle 50%: {fmt(d.p25)}–{fmt(d.p75)} {unit}</span>}
        <span>max {fmt(d.max)}</span>
      </div>
    </div>
  );
}

const money = (n?: number | null) => (n == null ? null : n >= 1e9 ? `$${(n / 1e9).toFixed(1)}B` : n >= 1e6 ? `$${Math.round(n / 1e6)}M` : `$${n.toLocaleString()}`);

/** Butterfly chart: talent lost to each rival on the left, gained from them on the right. */
export function RivalsButterfly({ rivals }: { rivals: Row[] }) {
  const rows = rivals.map((r) => ({
    name: r.companyName as string, url: r.linkedinUrl as string | null, gained: (r.gainedCount as number) ?? 0, lost: (r.lostCount as number) ?? 0,
    net: (r.netCount as number) ?? 0, stage: r.stage as string | null, funding: r.totalFundingUsd as number | null,
  }));
  const max = Math.max(1, ...rows.flatMap((r) => [r.gained, r.lost]));
  return (
    <div className="space-y-1">
      <div className="grid grid-cols-[1fr_12rem_1fr] gap-2 pb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        <span className="text-right">← Lost to them</span><span className="text-center">Rival</span><span>Gained from them →</span>
      </div>
      {rows.map((r) => (
        <div key={r.name} className="grid grid-cols-[1fr_12rem_1fr] items-center gap-2">
          <div className="flex items-center justify-end gap-1.5">
            <span className="text-xs tabular-nums text-muted-foreground">{r.lost || ""}</span>
            <div className="h-4 rounded-l bg-red-400/80" style={{ width: `${(r.lost / max) * 100}%` }} />
          </div>
          <div className="min-w-0 text-center">
            <p className="truncate text-sm font-medium">{r.url ? <a href={r.url} target="_blank" rel="noreferrer" className="hover:underline">{r.name}</a> : r.name}</p>
            <p className="text-[11px] text-muted-foreground">
              <span className={cn("font-semibold", r.net > 0 ? "text-emerald-600 dark:text-emerald-400" : r.net < 0 ? "text-red-600 dark:text-red-400" : "")}>net {r.net > 0 ? "+" : ""}{r.net}</span>
              {r.stage && ` · ${r.stage}`}{money(r.funding) && ` · ${money(r.funding)} raised`}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-4 rounded-r bg-emerald-500/80" style={{ width: `${(r.gained / max) * 100}%` }} />
            <span className="text-xs tabular-nums text-muted-foreground">{r.gained || ""}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
