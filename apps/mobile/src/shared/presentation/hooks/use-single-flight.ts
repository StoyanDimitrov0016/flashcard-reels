import { useCallback, useEffect, useRef, useState } from "react";

/** Acquire synchronously, before React renders the busy state. */
export function useSingleFlight<Args extends unknown[], Result>(
  action: (...args: Args) => Promise<Result>
) {
  const inFlight = useRef(false);
  const active = useRef(true);
  const [busy, setBusy] = useState(false);
  useEffect(function ownActionLifetime() {
    active.current = true;
    return function releaseActionLifetime() {
      active.current = false;
    };
  }, []);

  const isActive = useCallback(() => active.current, []);
  const run = useCallback(
    async (...args: Args): Promise<Result | undefined> => {
      if (inFlight.current || !active.current) {
        return undefined;
      }
      inFlight.current = true;
      setBusy(true);
      try {
        return await action(...args);
      } finally {
        inFlight.current = false;
        setBusy(false);
      }
    },
    [action]
  );

  return { run, busy, isActive };
}
