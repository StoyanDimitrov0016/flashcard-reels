import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-native", async () => {
  const { createElement: element } = await import("react");
  const component = ({ children }: { children?: ReactNode }) => element("div", null, children);
  return {
    Platform: { OS: "android", Version: 30 },
    useColorScheme: () => "dark",
    StyleSheet: { create: (styles: unknown) => styles },
    Pressable: component,
    ScrollView: component,
    Text: component,
    View: component,
  };
});
vi.mock("react-native-safe-area-context", async () => {
  const { createElement: element } = await import("react");
  return {
    SafeAreaView: ({ children }: { children?: ReactNode }) => element("div", null, children),
  };
});
vi.mock("expo-constants", () => ({ default: { expoConfig: { version: "0.1.0" } } }));

import { ErrorState } from "@/shared/presentation/components/error-state";

describe("presentational error state without app providers", () => {
  it("renders a usable fallback without PreferencesProvider or navigation", () => {
    const markup = renderToStaticMarkup(
      createElement(ErrorState, {
        actions: [{ label: "Try again", onPress: vi.fn() }],
        message: "The app could not finish starting.",
        title: "Couldn’t start the app",
      })
    );
    expect(markup).toContain("Couldn’t start the app");
    expect(markup).toContain("The app could not finish starting.");
    expect(markup).toContain("Try again");
    expect(markup).not.toContain("Reset all app data");
  });
});
