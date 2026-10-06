import { QueryClient } from "@tanstack/react-query";

/**
 * Queries read the local database, so they run offline and do not retry: a failed SQLite read is
 * not a transient network error. Data refetches when a screen mounts or its query key changes.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      mutations: { networkMode: "always", retry: false },
      queries: { networkMode: "always", refetchOnWindowFocus: false, retry: false },
    },
  });
}
