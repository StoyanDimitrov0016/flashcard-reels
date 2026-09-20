// @vitest-environment jsdom

import { createElement, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

vi.mock("react-native", async () => {
  const { createElement: element } = await import("react");
  const container = ({ children }: { children?: ReactNode }) => element("div", null, children);
  const pressable = ({ children, onPress }: { children?: ReactNode; onPress?: () => void }) =>
    element("button", { onClick: onPress, type: "button" }, children);
  return {
    Platform: { OS: "android", Version: 30 },
    useColorScheme: () => "dark",
    StyleSheet: { create: (styles: unknown) => styles },
    Pressable: pressable,
    Text: container,
    View: container,
  };
});
vi.mock("expo-constants", () => ({ default: { expoConfig: { version: "0.1.0" } } }));

import { AppResetAction } from "@/shared/presentation/components/app-reset-action";
import { AppRecoveryProvider } from "@/shared/presentation/context/app-recovery-context";

afterEach(() => {
  cleanup();
});

describe("AppResetAction recovery capability", () => {
  it("invokes the injected request after confirmation", () => {
    const requestAppDataReset = vi.fn();
    render(
      createElement(AppRecoveryProvider, {
        capability: { requestAppDataReset },
        children: createElement(AppResetAction),
      })
    );

    fireEvent.click(screen.getByRole("button", { name: "Reset all app data" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm full reset" }));

    expect(requestAppDataReset).toHaveBeenCalledOnce();
    expect(screen.getByText(/Reset scheduled\./)).toBeTruthy();
  });

  it("keeps the failure message visible when the injected request throws", () => {
    const requestAppDataReset = vi.fn(() => {
      throw new Error("reset unavailable");
    });
    render(
      createElement(AppRecoveryProvider, {
        capability: { requestAppDataReset },
        children: createElement(AppResetAction),
      })
    );

    fireEvent.click(screen.getByRole("button", { name: "Reset all app data" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm full reset" }));

    expect(requestAppDataReset).toHaveBeenCalledOnce();
    expect(
      screen.getByText(/Something went wrong while loading this part of the app\./)
    ).toBeTruthy();
    expect(screen.getByText(/You can clear app storage in device settings/)).toBeTruthy();
  });
});
