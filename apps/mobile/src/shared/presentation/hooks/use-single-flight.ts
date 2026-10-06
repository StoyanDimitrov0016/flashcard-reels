import { useEffect, useRef, useState } from "react";

/**
 * Runs one action at a time. The guard is taken synchronously, so a second tap before React renders
 * the busy state is ignored. Each action receives a signal that aborts when the owner unmounts, so
 * it can skip side effects, such as haptics or navigation, that no longer have a screen.
 */
export function useSingleFlight<Args extends unknown[], Result>(
  action: (signal: AbortSignal, ...args: Args) => Promise<Result>
) {
  const inFlight = useRef(false);
  const lifetime = useRef<AbortController | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(function ownActionLifetime() {
    const controller = new AbortController();
    lifetime.current = controller;
    return function endActionLifetime() {
      controller.abort();
    };
  }, []);

  async function run(...args: Args): Promise<Result | undefined> {
    const signal = lifetime.current?.signal;
    if (inFlight.current || !signal || signal.aborted) {
      return undefined;
    }
    inFlight.current = true;
    setBusy(true);
    try {
      return await action(signal, ...args);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return { run, busy };
}
