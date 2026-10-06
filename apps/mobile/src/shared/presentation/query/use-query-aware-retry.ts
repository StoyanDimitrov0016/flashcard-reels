import { useQueryErrorResetBoundary } from "@tanstack/react-query";

/**
 * A failed query keeps its error until it is reset, so a route boundary's retry would rethrow it
 * at once. Reset query errors first, then retry the route.
 */
export function useQueryAwareRetry(retry: () => unknown): () => void {
  const { reset } = useQueryErrorResetBoundary();

  return function retryWithFreshQueries() {
    reset();
    void retry();
  };
}
