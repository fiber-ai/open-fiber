import { useEffect, useRef } from "react";

interface UsePollingOptions {
  enabled: boolean;
  interval?: number;
  onPoll: () => void;
}

export function usePolling({ enabled, interval = 2000, onPoll }: UsePollingOptions) {
  const onPollRef = useRef(onPoll);
  onPollRef.current = onPoll;

  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => onPollRef.current(), interval);
    return () => clearInterval(id);
  }, [enabled, interval]);
}
