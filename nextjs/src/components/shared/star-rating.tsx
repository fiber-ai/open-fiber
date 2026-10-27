import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

/** Read-only 5-star rating with partial fill, e.g. 4.3 → four full stars and a 30% star. */
export function StarRating({ value, max = 5, className, size = "h-3.5 w-3.5" }: { value: number; max?: number; className?: string; size?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} aria-label={`${value} out of ${max} stars`}>
      {Array.from({ length: max }).map((_, i) => {
        const fill = Math.max(0, Math.min(1, value - i));
        return (
          <span key={i} className={cn("relative inline-block", size)}>
            <Star className={cn("absolute inset-0 text-muted-foreground/30", size)} />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star className={cn("fill-rating text-rating", size)} />
            </span>
          </span>
        );
      })}
    </span>
  );
}

/** Horizontal histogram of 1–5 star counts; clicking a row toggles it as a filter. */
export function RatingHistogram({
  counts, active, onToggle,
}: { counts: Record<number, number>; active?: number[]; onToggle?: (stars: number) => void }) {
  const max = Math.max(1, ...Object.values(counts));
  return (
    <div className="space-y-1">
      {[5, 4, 3, 2, 1].map((s) => {
        const n = counts[s] ?? 0;
        const on = !active || active.length === 0 || active.includes(s);
        return (
          <button
            key={s}
            type="button"
            disabled={!onToggle}
            onClick={() => onToggle?.(s)}
            className={cn("flex w-full items-center gap-2 text-xs", onToggle && "hover:opacity-80", !on && "opacity-40")}
          >
            <span className="w-3 text-right tabular-nums">{s}</span>
            <Star className="h-3 w-3 fill-rating text-rating" />
            <span className="h-1.5 flex-1 rounded-full bg-muted">
              <span className="block h-1.5 rounded-full bg-rating" style={{ width: `${(n / max) * 100}%` }} />
            </span>
            <span className="w-6 text-right tabular-nums text-muted-foreground">{n}</span>
          </button>
        );
      })}
    </div>
  );
}
