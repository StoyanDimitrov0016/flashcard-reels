import { useEffect, useState } from "react";

/** Counts down to `expiresAt`, updating once per second, and stops at zero. */
export function useSecondsRemaining(expiresAt: string | undefined): number | null {
  const [now, setNow] = useState(() => Date.now());

  useEffect(
    function tickUntilExpiry() {
      const interval = expiresAt ? setInterval(() => setNow(Date.now()), 1000) : undefined;
      return function stopTicking() {
        clearInterval(interval);
      };
    },
    [expiresAt]
  );

  if (!expiresAt) {
    return null;
  }
  return Math.max(0, Math.ceil((Date.parse(expiresAt) - now) / 1000));
}
