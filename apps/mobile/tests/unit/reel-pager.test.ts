import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";

/** @vitest-environment jsdom */
import { act, cleanup, render, screen } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

type ScrollEvent = NativeSyntheticEvent<NativeScrollEvent>;
const native = vi.hoisted(() => ({
  scrollToOffset: vi.fn(),
  onLoad: undefined as (() => void) | undefined,
  onScroll: undefined as ((event: ScrollEvent) => void) | undefined,
  onMomentumScrollEnd: undefined as ((event: ScrollEvent) => void) | undefined,
  onEndReached: undefined as (() => void) | undefined,
}));

vi.mock("react-native", () => ({
  View: ({
    children,
    accessibilityElementsHidden,
  }: Readonly<{
    children?: ReactNode;
    accessibilityElementsHidden?: boolean;
  }>) => createElement("div", { "aria-hidden": accessibilityElementsHidden }, children),
  StyleSheet: { create: (styles: unknown) => styles },
}));
vi.mock("@/shared/presentation/components/loading-state", () => ({
  LoadingState: () => createElement("span", { role: "status" }, "Restoring study position"),
}));
vi.mock("@shopify/flash-list", async () => {
  const { useImperativeHandle } = await import("react");
  return {
    FlashList: ({
      ref,
      onLoad,
      onScroll,
      onMomentumScrollEnd,
      onEndReached,
    }: Readonly<{
      ref: React.Ref<{ scrollToOffset: typeof native.scrollToOffset }>;
      onLoad: () => void;
      onScroll: (event: ScrollEvent) => void;
      onMomentumScrollEnd: (event: ScrollEvent) => void;
      onEndReached: () => void;
    }>) => {
      useImperativeHandle(ref, () => ({ scrollToOffset: native.scrollToOffset }));
      native.onLoad = onLoad;
      native.onScroll = onScroll;
      native.onMomentumScrollEnd = onMomentumScrollEnd;
      native.onEndReached = onEndReached;
      return createElement("div", { role: "region", "aria-label": "Reel pages" });
    },
  };
});

import { ReelPager } from "@/features/reels/presentation/components/reel-pager";
import { useReelFeed } from "@/features/reels/presentation/hooks/use-reel-feed";

import { makeFlashcard } from "../support/study-fixtures";

const occurrences = Array.from({ length: 6 }, (_, index) => ({
  card: makeFlashcard(index + 1),
  key: `occurrence-${index}`,
  recurrenceId: null,
  reelPosition: 120 + index,
}));

function scrollEvent(offset: number): ScrollEvent {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Native boundary emits only the fields read by the pager.
  return { nativeEvent: { contentOffset: { x: 0, y: offset } } } as ScrollEvent;
}

function StudyPager({ initialPosition = 122 }: Readonly<{ initialPosition?: number }>) {
  const { activeIndex, activeReelPosition, handleMomentumScrollEnd } = useReelFeed({
    initialReelPosition: initialPosition,
    loadedFromReelPosition: 120,
    itemHeight: 800,
    itemCount: occurrences.length,
  });
  return createElement(
    "div",
    null,
    createElement("span", null, activeReelPosition),
    createElement(ReelPager, {
      occurrences,
      initialIndex: activeIndex,
      height: 800,
      width: 400,
      extraData: activeIndex,
      renderItem: () => null,
      onEndReached: () => undefined,
      onMomentumScrollEnd: handleMomentumScrollEnd,
    })
  );
}

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

it("hides partially restored pages and ignores startup momentum until the saved reel is aligned", () => {
  render(createElement(StudyPager));
  expect(screen.queryByRole("region", { name: "Reel pages" })).toBeNull();
  expect(screen.getByRole("status").textContent).toBe("Restoring study position");
  act(() => {
    native.onScroll?.(scrollEvent(1200));
    native.onMomentumScrollEnd?.(scrollEvent(1200));
    native.onLoad?.();
  });
  expect(screen.getByRole("status")).toBeTruthy();
  expect(screen.getByText("122")).toBeTruthy();
  expect(native.scrollToOffset).toHaveBeenCalledWith({ offset: 1600, animated: false });

  act(() => native.onScroll?.(scrollEvent(1600)));
  expect(screen.queryByRole("status")).toBeNull();
  expect(screen.getByRole("region", { name: "Reel pages" })).toBeTruthy();
  act(() => {
    native.onScroll?.(scrollEvent(1900));
    native.onMomentumScrollEnd?.(scrollEvent(2400));
  });
  expect(screen.getByText("123")).toBeTruthy();
  expect(screen.queryByRole("status")).toBeNull();
});

it("reveals the first page after layout even when native scrolling emits no event at zero", () => {
  render(createElement(StudyPager, { initialPosition: 120 }));
  act(() => native.onLoad?.());
  expect(screen.queryByRole("status")).toBeNull();
  expect(screen.getByRole("region", { name: "Reel pages" })).toBeTruthy();
  expect(screen.getByText("120")).toBeTruthy();
});

it("waits for layout when the restored offset arrives before the list finishes drawing", () => {
  render(createElement(StudyPager));
  act(() => native.onScroll?.(scrollEvent(1600)));
  expect(screen.queryByRole("region", { name: "Reel pages" })).toBeNull();
  act(() => native.onLoad?.());
  expect(screen.getByRole("region", { name: "Reel pages" })).toBeTruthy();
});
