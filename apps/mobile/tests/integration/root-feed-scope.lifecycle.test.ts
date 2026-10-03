/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createElement, Fragment, type ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";

const harness = vi.hoisted(() => ({ navigate: vi.fn() }));

type ChildrenProps = Readonly<{ children?: ReactNode }>;
function Children({ children }: ChildrenProps) {
  return createElement(Fragment, null, children);
}

vi.mock("expo-router", () => ({
  Stack: Object.assign(
    function TestStack() {
      return createElement(Fragment, null, createElement(DeckRoute), createElement(FocusRoute));
    },
    { Screen: () => null }
  ),
  ThemeProvider: Children,
  useRouter: () => ({ navigate: harness.navigate }),
}));
vi.mock("react-native", () => ({
  View: Children,
  StyleSheet: { create: (styles: unknown) => styles },
  useColorScheme: () => "light",
}));
vi.mock("expo-sqlite", () => ({ SQLiteProvider: Children }));
vi.mock("expo-status-bar", () => ({ StatusBar: () => null }));
vi.mock("expo-system-ui", () => ({ setBackgroundColorAsync: async () => undefined }));
vi.mock("@/infrastructure/app-recovery", () => ({
  prepareAppStorage: vi.fn(),
  requestAppDataReset: vi.fn(),
}));
vi.mock("@/infrastructure/sqlite/database", () => ({
  DATABASE_NAME: "test.db",
  initializeDatabase: vi.fn(),
  handleSQLiteProviderError: vi.fn(),
}));
vi.mock("@/infrastructure/app-services", () => ({
  AppServicesProvider: Children,
  useAppServices: () => ({ preferencesService: {} }),
}));
vi.mock("@/features/preferences/presentation/controllers/preferences-context", () => ({
  PreferencesProvider: Children,
  usePreferencesContext: () => ({ ready: true }),
}));
vi.mock("@/features/preferences/presentation/preferences-theme-provider", () => ({
  PreferencesThemeProvider: Children,
}));
vi.mock("@/features/reels/presentation/controllers/use-focused-feed-lifecycle", () => ({
  useFocusedFeedLifecycle: () => false,
}));
vi.mock("@/shared/presentation/theme", () => ({
  AppThemeProvider: Children,
  getRouterTheme: () => ({}),
  useAppTheme: () => ({ colors: { canvas: "white" }, resolvedScheme: "light" }),
}));
vi.mock("@/shared/presentation/components/global-error-state", () => ({
  GlobalErrorState: () => null,
}));
vi.mock("@/shared/presentation/components/startup-loading-state", () => ({
  StartupLoadingState: () => null,
}));
vi.mock("@/shared/presentation/components/view-error-boundary", () => ({
  ViewErrorBoundary: Children,
}));
vi.mock("@/shared/presentation/flashcard-toast", () => ({ FlashcardToastHost: () => null }));
vi.mock("@/shared/presentation/native-splash", () => ({ revealApp: vi.fn() }));
vi.mock("../../global.css", () => ({}));

import RootLayout from "@/app/_layout";
import { useFeedScope } from "@/features/reels/presentation/context/feed-scope-context";
import { useOpenFocusedFeed } from "@/features/reels/presentation/hooks/use-open-focused-feed";

import { TEST_DECK_ID } from "../support/study-fixtures";

function DeckRoute() {
  const open = useOpenFocusedFeed();
  return createElement("button", { onClick: () => open(TEST_DECK_ID, null) }, "Study deck");
}
function FocusRoute() {
  const { focusedFeed } = useFeedScope();
  return createElement(
    "output",
    null,
    focusedFeed.status === "ready" ? focusedFeed.deckId : "No focused deck"
  );
}

afterEach(cleanup);

it("lets a deck stack route open Focus using the same feed scope as the tabs", async () => {
  render(createElement(RootLayout));
  fireEvent.click(await screen.findByRole("button", { name: "Study deck" }));
  expect(screen.getByText(TEST_DECK_ID)).toBeDefined();
  expect(harness.navigate).toHaveBeenCalledWith("/(tabs)/focus");
});
