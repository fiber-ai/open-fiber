import { useState, useRef, useCallback } from "react";
import { X, ChevronsUpDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface MultiSelectProps {
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select...",
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = options.filter((opt) =>
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = useCallback(
    (value: string) => {
      onChange(
        selected.includes(value)
          ? selected.filter((v) => v !== value)
          : [...selected, value]
      );
    },
    [selected, onChange]
  );

  const remove = useCallback(
    (value: string) => {
      onChange(selected.filter((v) => v !== value));
    },
    [selected, onChange]
  );

  // Compact trigger label
  const triggerLabel = () => {
    if (selected.length === 0) return <span className="text-muted-foreground">{placeholder}</span>;
    if (selected.length === 1) {
      const label = options.find((o) => o.value === selected[0])?.label ?? selected[0];
      return <span className="truncate">{label}</span>;
    }
    const first = options.find((o) => o.value === selected[0])?.label ?? selected[0];
    return (
      <span className="truncate">
        {first} <span className="text-muted-foreground">+{selected.length - 1} more</span>
      </span>
    );
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Trigger */}
      <Button
        type="button"
        variant="outline"
        className="w-full justify-between font-normal h-auto min-h-[36px] py-1.5"
        onClick={() => setOpen(!open)}
      >
        {triggerLabel()}
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>

      {/* Selected tags — shown below the trigger */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {selected.map((val) => {
            const label = options.find((o) => o.value === val)?.label ?? val;
            return (
              <Badge key={val} variant="secondary" className="text-xs gap-1 pl-2 pr-1 py-0.5">
                {label}
                <button
                  type="button"
                  className="hover:text-destructive rounded-sm"
                  onClick={() => remove(val)}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
          {selected.length > 1 && (
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground px-1"
              onClick={() => onChange([])}
            >
              Clear all
            </button>
          )}
        </div>
      )}

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
          <div className="p-2">
            <input
              type="text"
              className="w-full rounded-sm border px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-ring"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          <div className="max-h-60 overflow-y-auto p-1">
            {filtered.length === 0 && (
              <p className="px-2 py-4 text-center text-sm text-muted-foreground">
                No options found
              </p>
            )}
            {filtered.map((opt) => {
              const isSelected = selected.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent",
                    isSelected && "bg-accent"
                  )}
                  onClick={() => toggle(opt.value)}
                >
                  <Check
                    className={cn(
                      "h-4 w-4 shrink-0",
                      isSelected ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {opt.label}
                </button>
              );
            })}
          </div>
          {selected.length > 0 && (
            <div className="border-t p-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full text-xs"
                onClick={() => onChange([])}
              >
                Clear all ({selected.length})
              </Button>
            </div>
          )}
        </div>
      )}
      {open && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setOpen(false);
            setSearch("");
          }}
        />
      )}
    </div>
  );
}
