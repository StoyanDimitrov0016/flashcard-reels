import { useFocusEffect } from "expo-router";
import { useCallback, useRef } from "react";

/**
 * Refetches when a screen regains focus, skipping the first focus because mounting already
 * fetched. Follows TanStack Query's React Native guide, with Expo Router's focus events.
 */
export function useRefreshOnFocus(refetch: () => unknown): void {
  const firstFocus = useRef(true);

  useFocusEffect(
    useCallback(
      function refetchWhenFocused() {
        if (firstFocus.current) {
          firstFocus.current = false;
          return;
        }
        void refetch();
      },
      [refetch]
    )
  );
}
