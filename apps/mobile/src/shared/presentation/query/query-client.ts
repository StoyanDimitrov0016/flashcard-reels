import { QueryClient } from "@tanstack/react-query";

/**
 * Queries read the local database:
 * - `networkMode: "always"` runs them offline; the default would pause them without a network.
 * - No retries, because a failed SQLite read is not a transient network error.
 * - `throwOnError` sends load failures to the nearest route error boundary, whose retry resets
 *   them (see `useQueryAwareRetry`).
 * Cached data is stale immediately, so a screen that mounts or a returning app re-reads it.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      mutations: { networkMode: "always", retry: false },
      queries: { networkMode: "always", retry: false, throwOnError: true },
    },
  });
}
