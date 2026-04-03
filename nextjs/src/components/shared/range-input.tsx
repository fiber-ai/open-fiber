import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface RangeInputProps {
  label: string;
  min: number | null | undefined;
  max: number | null | undefined;
  onMinChange: (value: number | null) => void;
  onMaxChange: (value: number | null) => void;
  minPlaceholder?: string;
  maxPlaceholder?: string;
  formatPrefix?: string;
}

export function RangeInput({
  label,
  min,
  max,
  onMinChange,
  onMaxChange,
  minPlaceholder = "Min",
  maxPlaceholder = "Max",
  formatPrefix,
}: RangeInputProps) {
  const parseValue = (val: string): number | null => {
    if (!val) return null;
    const n = Number(val);
    return isNaN(n) ? null : n;
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          {formatPrefix && (
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              {formatPrefix}
            </span>
          )}
          <Input
            type="number"
            placeholder={minPlaceholder}
            value={min ?? ""}
            onChange={(e) => onMinChange(parseValue(e.target.value))}
            className={formatPrefix ? "pl-5 text-sm" : "text-sm"}
          />
        </div>
        <span className="text-xs text-muted-foreground">to</span>
        <div className="relative flex-1">
          {formatPrefix && (
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              {formatPrefix}
            </span>
          )}
          <Input
            type="number"
            placeholder={maxPlaceholder}
            value={max ?? ""}
            onChange={(e) => onMaxChange(parseValue(e.target.value))}
            className={formatPrefix ? "pl-5 text-sm" : "text-sm"}
          />
        </div>
      </div>
    </div>
  );
}
