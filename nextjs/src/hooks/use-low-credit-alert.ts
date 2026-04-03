import { useEffect, useRef } from "react";

/**
 * Checks any tRPC response data for chargeInfo.lowCreditAlert and fires a toast.
 * Deduplicates alerts — only shows once per 60 seconds.
 */
export function useLowCreditAlert(data: unknown) {
  const lastAlertTime = useRef(0);

  useEffect(() => {
    if (!data || typeof data !== "object") return;

    const obj = data as Record<string, unknown>;
    const chargeInfo = obj.chargeInfo as Record<string, unknown> | undefined;
    if (!chargeInfo?.lowCreditAlert) return;

    const alert = chargeInfo.lowCreditAlert as {
      message?: string;
      availableCredits?: number;
      getMoreCreditsUrl?: string;
    };

    // Deduplicate — don't spam toasts
    const now = Date.now();
    if (now - lastAlertTime.current < 60_000) return;
    lastAlertTime.current = now;

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("fiber-toast", {
          detail: {
            title: "Low Credits",
            description: alert.message ?? `Only ${alert.availableCredits ?? 0} credits remaining. Add more at fiber.ai/app/api.`,
            variant: "destructive",
          },
        })
      );
    }
  }, [data]);
}
