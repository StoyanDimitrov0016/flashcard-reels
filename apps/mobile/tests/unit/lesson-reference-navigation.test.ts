// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const lesson = { id: "lesson", title: "Scaling", order: 0 };
const nextLesson = { id: "next", title: "Caching", order: 1 };

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
    useWindowDimensions: () => ({ height: 800 }),
  };
});
vi.mock("expo-symbols", () => ({ SymbolView: () => null }));
vi.mock("@expo/ui/community/bottom-sheet", () => ({
  BottomSheetScrollView: ({ children }: Readonly<{ children: ReactNode }>) => children,
}));
vi.mock("@/shared/presentation/theme", async () => {
  const { getAppColors } = await import("@/shared/presentation/theme-colors");
  return { useAppTheme: () => ({ colors: getAppColors("dark") }) };
});
vi.mock("@/features/lessons/presentation/dependencies/use-lessons", () => ({
  useLessonsCapability: () => ({
    lessonService: {
      listReadingLists: async () => [
        { deckId: "deck", deckTitle: "Systems", lessons: [lesson, nextLesson] },
      ],
    },
  }),
}));
vi.mock("@/shared/presentation/components/app-bottom-sheet", () => ({
  AppBottomSheet: ({ children, visible }: Readonly<{ children: ReactNode; visible: boolean }>) =>
    visible ? children : null,
}));
vi.mock("@/shared/presentation/components/sheet-header", async () => {
  const { createElement: element } = await import("react");
  return { SheetHeader: ({ title }: Readonly<{ title: string }>) => element("h1", null, title) };
});
// Native layout/scrolling belongs to the Maestro device scenario. Keep the reader boundary observable here while
// exercising the real provider, reading button, and lesson list transitions.
vi.mock("@/features/lessons/presentation/components/sheet-lesson-reader", async () => {
  const { createElement: element } = await import("react");
  const { LessonSheetNavigation } =
    await import("@/features/lessons/presentation/components/lesson-sheet-navigation");
  type ReaderProps = Readonly<{
    lesson: { title: string };
    sectionId: string | null;
    onClose: () => void;
    onBack: () => void;
    nextLesson?: { id: string; title: string; order: number };
    onOpenLesson: (lesson: { id: string; title: string; order: number }) => void;
  }>;
  function SheetLessonReader({
    lesson: current,
    sectionId,
    onClose,
    onBack,
    nextLesson: next,
    onOpenLesson,
  }: ReaderProps) {
    return element(
      "section",
      { "aria-label": "Lesson reader" },
      element("h1", null, current.title),
      element("p", null, sectionId ?? "Lesson beginning"),
      element("button", { onClick: onClose }, "Close lesson"),
      element(LessonSheetNavigation, { nextLesson: next, onBack, onOpenLesson })
    );
  }
  return { SheetLessonReader };
});

import { ReadingButton } from "@/features/lessons/presentation/components/reading-button";
import { DeckLessonsProvider } from "@/features/lessons/presentation/context/deck-lessons-context";

import { createQueryWrapper } from "../support/query-client";

afterEach(cleanup);

function references() {
  return createElement(
    createQueryWrapper(),
    null,
    createElement(
      DeckLessonsProvider,
      null,
      [
        ["Vertical card", "vertical-scaling"],
        ["Another vertical card", "vertical-scaling"],
        ["Limitations card", "vertical-scaling/limitations"],
        ["Whole lesson card", null],
      ].map(([name, sectionId]) =>
        createElement(
          "div",
          { role: "group", "aria-label": name, key: name },
          createElement(ReadingButton, { deckId: "deck", lessonId: "lesson", sectionId })
        )
      )
    )
  );
}

async function openCard(name: string) {
  const button = await within(screen.getByRole("group", { name })).findByRole("button", {
    name: "Read connected lesson",
  });
  // The button is shown before the deck's lessons load; tapping it opens them once they have.
  await waitFor(() => {
    fireEvent.click(button);
    expect(screen.getByRole("region", { name: "Lesson reader" })).toBeTruthy();
  });
  return screen.getByRole("region", { name: "Lesson reader" });
}

async function expectDestination(card: string, destination: string) {
  const reader = await openCard(card);
  expect(within(reader).getByText(destination)).toBeTruthy();
}

describe("card lesson destinations", () => {
  it("lets cards share a section and switches destinations within the same lesson", async () => {
    render(references());
    await expectDestination("Vertical card", "vertical-scaling");
    await expectDestination("Another vertical card", "vertical-scaling");
    await expectDestination("Limitations card", "vertical-scaling/limitations");
    await expectDestination("Whole lesson card", "Lesson beginning");
  });

  it("clears the card destination when choosing a lesson from the list or moving to the next lesson", async () => {
    render(references());
    await openCard("Limitations card");
    fireEvent.click(screen.getByRole("button", { name: "Back to lessons" }));
    fireEvent.click(screen.getByRole("button", { name: "Lesson 1: Scaling" }));
    expect(
      within(screen.getByRole("region", { name: "Lesson reader" })).getByText("Lesson beginning")
    ).toBeTruthy();
    await openCard("Vertical card");
    fireEvent.click(screen.getByRole("button", { name: "Next lesson: Caching" }));
    expect(screen.getByRole("heading", { name: "Caching" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^Next lesson:/ })).toBeNull();
    expect(screen.getByRole("button", { name: "Back to lessons" })).toBeTruthy();
    expect(
      within(screen.getByRole("region", { name: "Lesson reader" })).getByText("Lesson beginning")
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Close lesson" }));
    expect(screen.queryByRole("region", { name: "Lesson reader" })).toBeNull();
    await expectDestination("Limitations card", "vertical-scaling/limitations");
  });
});
