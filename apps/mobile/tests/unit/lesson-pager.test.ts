// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("react-native", async () => {
  const { createElement: element } = await import("react");
  type NativeProps = Readonly<{
    children?: ReactNode;
    accessibilityLabel?: string;
    onPress?: () => void;
  }>;
  function Container({ children }: NativeProps) {
    return element("div", null, children);
  }
  function Pressable({ children, accessibilityLabel, onPress }: NativeProps) {
    return element("button", { "aria-label": accessibilityLabel, onClick: onPress }, children);
  }
  return {
    View: Container,
    Text: Container,
    Pressable,
    StyleSheet: { create: (styles: unknown) => styles },
  };
});
vi.mock("expo-symbols", () => ({ SymbolView: () => null }));
vi.mock("@/shared/presentation/theme", async () => {
  const { getAppColors } = await import("@/shared/presentation/theme-colors");
  return { useAppTheme: () => ({ colors: getAppColors("dark") }) };
});

import { LessonPager } from "@/features/lessons/presentation/components/lesson-pager";

const basics = { id: "a", order: 0, title: "Basics" };
const sharding = { id: "c", order: 2, title: "Sharding" };

afterEach(cleanup);

describe("lesson pager", () => {
  it("names the lessons before and after by title", () => {
    const onOpenLesson = vi.fn();
    render(createElement(LessonPager, { next: sharding, onOpenLesson, previous: basics }));

    expect(screen.getByText("Basics")).toBeTruthy();
    expect(screen.getByText("Sharding")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Previous lesson: Basics" }));
    fireEvent.click(screen.getByRole("button", { name: "Next lesson: Sharding" }));
    expect(onOpenLesson.mock.calls).toEqual([[basics], [sharding]]);
  });

  it("shows only the lesson that exists at either end", () => {
    render(
      createElement(LessonPager, { next: sharding, onOpenLesson: vi.fn(), previous: undefined })
    );

    expect(screen.queryByRole("button", { name: /^Previous lesson/ })).toBeNull();
    expect(screen.getByRole("button", { name: "Next lesson: Sharding" })).toBeTruthy();
  });
});
