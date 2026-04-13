import { cn } from "@/lib/utils";

interface ToggleOption<T extends string> {
  value: T;
  label: string;
  icon?: React.ElementType;
}

interface ToggleButtonGroupProps<T extends string> {
  options: ToggleOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export function ToggleButtonGroup<T extends string>({
  options,
  value,
  onChange,
  className,
}: ToggleButtonGroupProps<T>) {
  return (
    <div className={cn("inline-flex items-center rounded-lg border bg-muted p-0.5", className)}>
      {options.map((opt) => {
        const Icon = opt.icon;
        const isActive = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => onChange(opt.value)}
          >
            {Icon && <Icon className="h-4 w-4" />}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
