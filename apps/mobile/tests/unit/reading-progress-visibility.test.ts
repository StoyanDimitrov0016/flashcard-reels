// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useReadingProgressVisibility } from "@/features/lessons/presentation/controllers/use-reading-progress-visibility";

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("transient reading progress", () => {
  it("stays hidden on opening and programmatic section positioning", () => {
    const { result } = renderHook(useReadingProgressVisibility);
    act(() => {
      result.current.scrollViewProps.onMomentumScrollBegin();
      result.current.scrollViewProps.onMomentumScrollEnd();
    });
    expect(result.current.visible).toBe(false);
  });

  it("shows while dragging and disappears one second after the drag ends", () => {
    const { result } = renderHook(useReadingProgressVisibility);
    act(() => result.current.scrollViewProps.onScrollBeginDrag());
    act(() => {
      vi.advanceTimersByTime(2_000);
    });
    expect(result.current.visible).toBe(true);
    act(() => result.current.scrollViewProps.onScrollEndDrag());
    expect(result.current.visible).toBe(true);
    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(result.current.visible).toBe(false);
  });

  it("keeps progress visible through momentum, then hides after the glide stops", () => {
    const { result } = renderHook(useReadingProgressVisibility);
    act(() => {
      result.current.scrollViewProps.onScrollBeginDrag();
      result.current.scrollViewProps.onScrollEndDrag();
      result.current.scrollViewProps.onMomentumScrollBegin();
    });
    act(() => {
      vi.advanceTimersByTime(2_000);
    });
    expect(result.current.visible).toBe(true);
    act(() => result.current.scrollViewProps.onMomentumScrollEnd());
    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(result.current.visible).toBe(false);
  });

  it("does not let an earlier hide deadline interrupt a new finger scroll", () => {
    const { result } = renderHook(useReadingProgressVisibility);
    act(() => {
      result.current.scrollViewProps.onScrollBeginDrag();
      result.current.scrollViewProps.onScrollEndDrag();
    });
    act(() => {
      vi.advanceTimersByTime(600);
    });
    act(() => result.current.scrollViewProps.onScrollBeginDrag());
    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(result.current.visible).toBe(true);
    act(() => result.current.scrollViewProps.onScrollEndDrag());
    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(result.current.visible).toBe(false);
  });
});
