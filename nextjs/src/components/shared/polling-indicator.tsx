interface PollingIndicatorProps {
  message?: string;
}

export function PollingIndicator({ message = "Processing..." }: PollingIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-3 py-12">
      <div className="relative">
        <div className="h-8 w-8 rounded-full border-4 border-muted" />
        <div className="absolute inset-0 h-8 w-8 animate-spin rounded-full border-4 border-transparent border-t-primary" />
      </div>
      <span className="text-sm text-muted-foreground">{message}</span>
    </div>
  );
}
