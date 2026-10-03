// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const harness = vi.hoisted(() => ({
  position: "right" as "left" | "bottom" | "right",
  direction: "forward" as "forward" | "reverse",
  ratingSelected: vi.fn(),
}));

vi.mock("react-native", async () => {
  const { createElement: element } = await import("react");
  type PressableProps = Readonly<{
    children?: ReactNode;
    onPress?: () => void;
    disabled?: boolean;
    accessibilityLabel?: string;
    accessibilityState?: { selected?: boolean };
  }>;
  function Pressable({
    children,
    onPress,
    disabled,
    accessibilityLabel,
    accessibilityState,
  }: PressableProps) {
    return element(
      "button",
      {
        type: "button",
        onClick: onPress,
        disabled,
        "aria-label": accessibilityLabel,
        "aria-pressed": accessibilityState?.selected,
      },
      children
    );
  }
  function Container({ children }: Readonly<{ children?: ReactNode }>) {
    return element("div", null, children);
  }
  return {
    Pressable,
    Text: Container,
    View: Container,
    StyleSheet: { create: (styles: unknown) => styles },
  };
});
vi.mock("expo-symbols", () => ({ SymbolView: () => null }));
vi.mock("@/shared/presentation/theme", async () => {
  const { getAppColors } = await import("@/shared/presentation/theme-colors");
  return { useAppTheme: () => ({ colors: getAppColors("dark") }) };
});
vi.mock("@/features/preferences/presentation/controllers/preferences-context", async () => {
  const { defaultAppPreferences } = await import("@/features/preferences/domain/app-preferences");
  return {
    usePreferencesContext: () => ({
      preferences: {
        ...defaultAppPreferences,
        studyIslandPosition: harness.position,
        ratingDirection: harness.direction,
      },
    }),
  };
});
vi.mock("@/features/preferences/presentation/controllers/use-haptics", () => ({
  useHaptics: () => ({ ratingSelected: harness.ratingSelected }),
}));

import { RecallControls } from "@/features/reels/presentation/components/recall-controls";
import { StudyControlLayoutProvider } from "@/features/reels/presentation/context/study-control-layout-context";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function controls(
  onSelect: (rating: string) => void,
  ratingEnabled: boolean,
  selectedRating: "hard" | null = null
) {
  return createElement(StudyControlLayoutProvider, {
    children: createElement(RecallControls, { onSelect, ratingEnabled, selectedRating }),
  });
}

describe.each(["left", "bottom", "right"] as const)("recall controls at %s", (position) => {
  it.each(["forward", "reverse"] as const)(
    "preserves rating meanings in %s order and exposes the selection",
    (direction) => {
      harness.position = position;
      harness.direction = direction;
      const onSelect = vi.fn();
      const view = render(controls(onSelect, true));
      const expectedFirst =
        direction === "forward" ? "Recall rating: Again" : "Recall rating: Easy";
      expect(screen.getAllByRole("button")[0]).toBe(
        screen.getByRole("button", { name: expectedFirst })
      );

      for (const [label, rating] of [
        ["Again", "again"],
        ["Hard", "hard"],
        ["Good", "good"],
        ["Easy", "easy"],
      ]) {
        fireEvent.click(screen.getByRole("button", { name: `Recall rating: ${label}` }));
        expect(onSelect).toHaveBeenLastCalledWith(rating);
      }
      expect(onSelect).toHaveBeenCalledTimes(4);
      expect(harness.ratingSelected).toHaveBeenCalledTimes(4);

      view.rerender(controls(onSelect, true, "hard"));
      expect(screen.getAllByRole("button", { pressed: true })).toEqual([
        screen.getByRole("button", { name: "Recall rating: Hard" }),
      ]);
    }
  );
});

it("prevents ratings and haptic feedback until the answer enables the controls", () => {
  const onSelect = vi.fn();
  const view = render(controls(onSelect, false));
  for (const button of screen.getAllByRole("button")) {
    expect(button).toHaveProperty("disabled", true);
    fireEvent.click(button);
  }
  expect(onSelect).not.toHaveBeenCalled();
  expect(harness.ratingSelected).not.toHaveBeenCalled();

  view.rerender(controls(onSelect, true));
  fireEvent.click(screen.getByRole("button", { name: "Recall rating: Good" }));
  expect(onSelect).toHaveBeenCalledOnce();
  expect(onSelect).toHaveBeenCalledWith("good");
});
