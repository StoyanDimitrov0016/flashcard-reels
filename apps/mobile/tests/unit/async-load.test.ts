/** @vitest-environment jsdom */
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useAsyncLoad } from "@/shared/presentation/hooks/use-async-load";

import { deferred } from "../support/deferred";

const onError = (error: unknown) => (error instanceof Error ? error : new Error("load failed"));
afterEach(cleanup);
describe("async load lifetime", () => {
  it("hides outdated data immediately and ignores a superseded request", async () => {
    const old = deferred<string>();
    const next = deferred<string>();
    const oldLoad = () => old.promise;
    const nextLoad = () => next.promise;
    const mounted = renderHook(
      ({ load }) => useAsyncLoad({ load, initialData: "", onError, gate: true }),
      { initialProps: { load: oldLoad } }
    );
    mounted.rerender({ load: nextLoad });
    expect(mounted.result.current).toMatchObject({ data: "", loading: true });
    await act(async () => next.resolve("new"));
    await act(async () => old.resolve("old"));
    expect(mounted.result.current).toMatchObject({ data: "new", loading: false, error: null });
  });
  it("releases loading after failure and retries the same input", async () => {
    const failure = new Error("offline");
    const load = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(failure)
      .mockResolvedValueOnce("recovered");
    const mounted = renderHook(() => useAsyncLoad({ load, initialData: "", onError }));
    await waitFor(() =>
      expect(mounted.result.current).toMatchObject({ data: "", loading: false, error: failure })
    );
    act(() => mounted.result.current.refresh());
    expect(mounted.result.current.loading).toBe(true);
    await waitFor(() =>
      expect(mounted.result.current).toMatchObject({
        data: "recovered",
        loading: false,
        error: null,
      })
    );
    expect(load).toHaveBeenCalledTimes(2);
  });
  it("does not load a disabled request", () => {
    const load = vi.fn(async () => "data");
    renderHook(() => useAsyncLoad({ load, initialData: "", onError, enabled: false }));
    expect(load).not.toHaveBeenCalled();
  });
});
