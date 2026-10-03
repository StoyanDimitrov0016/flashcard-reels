/** @vitest-environment jsdom */
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useSingleFlight } from "@/shared/presentation/hooks/use-single-flight";

import { deferred } from "../support/deferred";

afterEach(cleanup);
describe("single action flight", () => {
  it("ignores synchronous duplicate runs and permits a retry after failure", async () => {
    const pending = deferred<number>();
    const action = vi.fn().mockReturnValueOnce(pending.promise).mockResolvedValueOnce(2);
    const hook = renderHook(() => useSingleFlight(action));
    let first: Promise<unknown> = Promise.resolve();
    let second: Promise<unknown> = Promise.resolve();
    act(() => {
      first = hook.result.current.run();
      second = hook.result.current.run();
    });
    expect(action).toHaveBeenCalledOnce();
    await expect(second).resolves.toBeUndefined();
    expect(hook.result.current.busy).toBe(true);
    const failure = first.catch((error: unknown) => error);
    await act(async () => {
      pending.reject(new Error("failed"));
      await failure;
    });
    expect(hook.result.current.busy).toBe(false);
    await act(async () => {
      expect(await hook.result.current.run()).toBe(2);
    });
    expect(action).toHaveBeenCalledTimes(2);
  });
  it("does not start actions after the owner unmounts", async () => {
    const action = vi.fn().mockResolvedValue(true);
    const hook = renderHook(() => useSingleFlight(action));
    const run = hook.result.current.run;
    hook.unmount();
    await expect(run()).resolves.toBeUndefined();
    expect(action).not.toHaveBeenCalled();
  });
});
