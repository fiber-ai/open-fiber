import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

/**
 * Renders the markdown summaries some endpoints return (depth chart, talent flow,
 * Mosaic reports) with GFM tables, styled to match the rest of the app.
 */
export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cn("space-y-3 text-sm leading-relaxed", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h2 className="mt-2 text-lg font-semibold">{children}</h2>,
          h2: ({ children }) => <h3 className="mt-2 text-base font-semibold">{children}</h3>,
          h3: ({ children }) => <h4 className="mt-2 text-sm font-semibold">{children}</h4>,
          p: ({ children }) => <p className="text-sm">{children}</p>,
          ul: ({ children }) => <ul className="ml-5 list-disc space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="ml-5 list-decimal space-y-1">{children}</ol>,
          a: ({ href, children }) => <a href={href} target="_blank" rel="noreferrer" className="text-primary underline-offset-2 hover:underline">{children}</a>,
          blockquote: ({ children }) => <blockquote className="border-l-2 pl-3 text-muted-foreground">{children}</blockquote>,
          hr: () => <hr className="my-2" />,
          code: ({ className: c, children }) => {
            const block = /language-/.test(c ?? "") || String(children).includes("\n");
            return block
              ? <code className="block overflow-x-auto rounded-md border bg-muted/40 p-3 font-mono text-xs leading-relaxed">{children}</code>
              : <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">{children}</code>;
          },
          pre: ({ children }) => <pre className="whitespace-pre">{children}</pre>,
          table: ({ children }) => <div className="overflow-x-auto rounded-md border"><table className="w-full text-xs">{children}</table></div>,
          thead: ({ children }) => <thead className="bg-muted/50 text-muted-foreground">{children}</thead>,
          th: ({ children, style }) => <th className="px-3 py-1.5 text-left font-medium" style={style}>{children}</th>,
          td: ({ children, style }) => <td className="border-t px-3 py-1.5 tabular-nums" style={style}>{children}</td>,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
