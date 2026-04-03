import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaginationControlsProps {
  hasNextPage: boolean;
  hasPrevPage: boolean;
  onNext: () => void;
  onPrev: () => void;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  resultCount?: number;
}

const PAGE_SIZES = [10, 25, 50, 100];

export function PaginationControls({
  hasNextPage,
  hasPrevPage,
  onNext,
  onPrev,
  pageSize,
  onPageSizeChange,
  resultCount,
}: PaginationControlsProps) {
  return (
    <div className="flex items-center justify-between border-t px-4 py-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {resultCount !== undefined && (
          <span>{resultCount} results on this page</span>
        )}
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Rows:</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="rounded-md border bg-background px-2 py-1 text-sm"
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={!hasPrevPage}
            onClick={onPrev}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={!hasNextPage}
            onClick={onNext}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
