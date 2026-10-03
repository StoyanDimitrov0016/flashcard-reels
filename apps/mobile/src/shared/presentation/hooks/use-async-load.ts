import { useCallback, useEffect, useState } from "react";

type AsyncLoadOptions<T> = Readonly<{
  load: () => Promise<T>;
  initialData: T;
  onError: (error: unknown) => Error;
  enabled?: boolean;
  gate?: boolean;
}>;

/** Callers own data and error policy; this hook owns the cancellable load lifetime. */
export function useAsyncLoad<T>({
  load,
  initialData,
  onError,
  enabled = true,
  gate = false,
}: AsyncLoadOptions<T>) {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<
    Readonly<{
      data: T;
      error: Error | null;
      loading: boolean;
      request: (() => Promise<T>) | null;
      revision: number | null;
    }>
  >({ data: initialData, error: null, loading: true, request: null, revision: null });
  useEffect(
    function loadCurrentRequest() {
      if (!enabled) {
        return undefined;
      }
      let active = true;
      void load()
        .then((data) => {
          if (active) {
            setState({ data, error: null, loading: false, request: load, revision });
          }
        })
        .catch((cause: unknown) => {
          if (active) {
            setState({
              data: initialData,
              error: onError(cause),
              loading: false,
              request: load,
              revision,
            });
          }
        });
      return function ignoreSupersededRequest() {
        active = false;
      };
    },
    [load, initialData, onError, enabled, revision]
  );
  const refresh = useCallback((showLoading = true) => {
    if (showLoading) {
      setState((current) => ({ ...current, loading: true }));
    }
    setRevision((current) => current + 1);
  }, []);

  if (gate && (state.request !== load || state.revision !== revision)) {
    return { data: initialData, error: null, loading: true, refresh };
  }
  return { data: state.data, error: state.error, loading: state.loading, refresh };
}
