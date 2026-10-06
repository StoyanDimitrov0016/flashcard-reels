import { focusManager, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { AppState, Platform, type AppStateStatus } from "react-native";

import { createQueryClient } from "@/shared/presentation/query/query-client";

function onAppStateChange(status: AppStateStatus) {
  // On the web, TanStack Query already follows the browser's visibility.
  if (Platform.OS !== "web") {
    focusManager.setFocused(status === "active");
  }
}

type AppQueryProviderProps = Readonly<{ children: ReactNode }>;

/** Owns the app's query cache and refetches active queries when the app returns to the foreground. */
export function AppQueryProvider({ children }: AppQueryProviderProps) {
  const [queryClient] = useState(createQueryClient);

  useEffect(function followAppFocus() {
    const subscription = AppState.addEventListener("change", onAppStateChange);
    return function stopFollowingAppFocus() {
      subscription.remove();
    };
  }, []);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
