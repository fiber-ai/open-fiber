import { Fragment } from "react";
import { cn } from "@/lib/utils";
import { CopyButton } from "./copy-button";

/**
 * Lightweight syntax-highlighted JSON block (no extra deps). Tokenises the
 * pretty-printed string so keys, strings, numbers and literals get their own colour.
 */
const TOKEN_SRC = /("(?:\\.|[^"\\])*"(?=\s*:))|("(?:\\.|[^"\\])*")|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|\b(true|false|null)\b/g;

function highlight(json: string) {
  const parts: React.ReactNode[] = [];
  let last = 0;
  const TOKEN = new RegExp(TOKEN_SRC.source, "g");
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = TOKEN.exec(json)) !== null) {
    if (m.index > last) parts.push(<Fragment key={i++}>{json.slice(last, m.index)}</Fragment>);
    const cls = m[1]
      ? "text-sky-700 dark:text-sky-300"
      : m[2]
        ? "text-emerald-700 dark:text-emerald-300"
        : m[3]
          ? "text-amber-700 dark:text-amber-300"
          : "text-fuchsia-700 dark:text-fuchsia-300";
    parts.push(<span key={i++} className={cls}>{m[0]}</span>);
    last = m.index + m[0].length;
  }
  if (last < json.length) parts.push(<Fragment key={i++}>{json.slice(last)}</Fragment>);
  return parts;
}

export function JsonView({ value, className, maxHeight = "24rem" }: { value: unknown; className?: string; maxHeight?: string }) {
  const text = JSON.stringify(value, null, 2) ?? "undefined";
  return (
    <div className={cn("relative rounded-md border bg-muted/40", className)}>
      <CopyButton value={text} className="absolute right-2 top-2 bg-background/80" />
      <pre className="overflow-auto p-3 pr-10 text-xs leading-relaxed font-mono" style={{ maxHeight }}>
        {highlight(text)}
      </pre>
    </div>
  );
}
