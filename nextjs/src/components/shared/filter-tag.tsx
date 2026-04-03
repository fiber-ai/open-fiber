import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface FilterTagProps {
  label: string;
  value: string;
  onRemove: () => void;
}

export function FilterTag({ label, value, onRemove }: FilterTagProps) {
  return (
    <Badge variant="secondary" className="gap-1 text-xs">
      <span className="font-medium">{label}:</span>
      <span>{value}</span>
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 hover:text-destructive"
      >
        <X className="h-3 w-3" />
      </button>
    </Badge>
  );
}
