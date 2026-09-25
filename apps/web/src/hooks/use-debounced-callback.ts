import { useEffect, useRef } from "react";

/** Returns a function that runs `callback` once calls stop for `delayMs`. */
export function useDebouncedCallback<Args extends unknown[]>(
  callback: (...args: Args) => void,
  delayMs: number
): (...args: Args) => void {
  const callbackRef = useRef(callback);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(
    function keepLatestCallback() {
      callbackRef.current = callback;
    },
    [callback]
  );

  useEffect(function cancelPendingCallOnUnmount() {
    return function clearPendingTimeout() {
      clearTimeout(timeoutRef.current);
    };
  }, []);

  return (...args: Args) => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => callbackRef.current(...args), delayMs);
  };
}
