import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// State/effect doubles let server-rendered markup exercise scanner branches.
// This is not a native camera or navigation integration test.
const harness = vi.hoisted(() => ({
  slots: [] as unknown[],
  cursor: 0,
  effects: [] as (() => undefined | (() => void))[],
  onAppState: undefined as ((state: string) => void) | undefined,
  focused: true,
  appState: "active",
  getPermission: vi.fn(),
  requestPermission: vi.fn(),
}));
vi.mock("react", async () => ({
  ...(await vi.importActual("react")),
  useState: (initial: unknown) => {
    const slot = harness.cursor++;
    if (!(slot in harness.slots)) {
      harness.slots[slot] = initial;
    }
    return [
      harness.slots[slot],
      (next: unknown) => {
        harness.slots[slot] = typeof next === "function" ? next(harness.slots[slot]) : next;
      },
    ];
  },
  useRef: (current: unknown) => ({ current }),
  useEffect: (effect: () => undefined | (() => void)) => {
    harness.effects.push(effect);
  },
}));
vi.mock("react-native", async () => {
  const { createElement: element } = await import("react");
  const component = ({ children }: { children?: ReactNode }) => element("div", null, children);
  return {
    Text: component,
    View: component,
    Pressable: component,
    ActivityIndicator: component,
    StyleSheet: { create: (styles: unknown) => styles },
    Linking: { openSettings: vi.fn() },
    AppState: {
      get currentState() {
        return harness.appState;
      },
      addEventListener: (_event: string, callback: (state: string) => void) => {
        harness.onAppState = callback;
        return { remove: vi.fn() };
      },
    },
  };
});
vi.mock("expo-camera", async () => {
  const { createElement: element } = await import("react");
  return {
    CameraView: () => element("span", null, "camera-preview"),
    useCameraPermissions: () => [
      { granted: true },
      harness.requestPermission,
      harness.getPermission,
    ],
  };
});
vi.mock("expo-router", () => ({ useIsFocused: () => harness.focused }));
vi.mock("expo-symbols", () => ({ SymbolView: () => null }));
vi.mock("@/shared/presentation/theme", () => ({ useAppTheme: () => ({ colors: {} }) }));
vi.mock("@/shared/presentation/errors/report-error", () => ({ reportError: vi.fn() }));
vi.mock("@/shared/presentation/components/app-bottom-sheet", () => ({
  AppBottomSheet: ({ children }: { children: ReactNode }) => children,
}));

import { ImportDeckSheet } from "@/features/decks/presentation/components/import-deck-sheet";

const props = {
  downloading: false,
  errorMessage: null,
  importing: false,
  onBrowse: vi.fn(),
  onClose: vi.fn(),
  onClearError: vi.fn(),
  onScan: vi.fn(),
  visible: true,
};
function renderScanner(visible = true) {
  harness.cursor = 0;
  harness.effects = [];
  return renderToStaticMarkup(createElement(ImportDeckSheet, { ...props, visible }));
}

describe("scanner visibility and feedback separation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    harness.slots = ["scanner"];
    harness.focused = true;
    harness.appState = "active";
    harness.onAppState = undefined;
    harness.getPermission.mockResolvedValue({ granted: true });
  });

  it("renders the preview only when the sheet is visible and focused", () => {
    expect(renderScanner()).toContain("camera-preview");
    expect(renderScanner(false)).not.toContain("camera-preview");
    harness.focused = false;
    expect(renderScanner()).not.toContain("camera-preview");
  });

  it("does not mount a camera preview while the app is in the background", () => {
    harness.appState = "background";
    expect(renderScanner()).not.toContain("camera-preview");
  });

  it("preserves a scanned-code failure when foreground permission refresh succeeds", async () => {
    harness.slots = [
      "scanner",
      "That isn’t a deck import code.",
      "Old permission error",
      true,
      false,
      true,
    ];
    renderScanner();
    const cleanup = harness.effects[1]?.();
    harness.onAppState?.("active");
    await Promise.resolve();
    await Promise.resolve();
    const markup = renderScanner();
    expect(markup).toContain("That isn’t a deck import code.");
    expect(markup).toContain("Scan again");
    expect(markup).not.toContain("Couldn’t import this deck.");
    expect(harness.slots[2]).toBeNull();
    cleanup?.();
  });
});
