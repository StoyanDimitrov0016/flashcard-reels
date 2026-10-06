import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";

import { reportError } from "@/shared/errors/report-error";

type AppQueryMeta = Readonly<{
  /**
   * Reports a failure under this label. Set it on queries and mutations whose errors are shown in
   * place; failures that reach a route boundary are reported by the boundary.
   */
  errorReport?: string;
}>;

declare module "@tanstack/react-query" {
  interface Register {
    queryMeta: AppQueryMeta;
    mutationMeta: AppQueryMeta;
  }
}

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
    queryCache: new QueryCache({
      onError: (error, query) => {
        if (query.meta?.errorReport) {
          reportError(error, query.meta.errorReport);
        }
      },
    }),
    mutationCache: new MutationCache({
      onError: (error, _variables, _onMutateResult, mutation) => {
        if (mutation.meta?.errorReport) {
          reportError(error, mutation.meta.errorReport);
        }
      },
    }),
    defaultOptions: {
      mutations: { networkMode: "always", retry: false },
      queries: { networkMode: "always", retry: false, throwOnError: true },
    },
  });
}
