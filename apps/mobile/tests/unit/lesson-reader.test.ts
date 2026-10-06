// @vitest-environment jsdom
/// <reference lib="dom" />

import { act, cleanup, render, screen } from "@testing-library/react";
import { createElement, type ReactNode, type Ref } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Lesson as LessonEntity, type Lesson } from "@/features/lessons/domain/lesson.model";

type Layout = { nativeEvent: { layout: { y: number; height: number; width: number; x: number } } };
const state = vi.hoisted(() => ({
  layouts: new Map<HTMLElement, (event: Layout) => void>(),
  sizes: new Map<HTMLElement, (width: number, height: number) => void>(),
  scrollTo: vi.fn(),
  reportError: vi.fn(),
  lesson: null as Lesson | null,
}));

vi.mock("react-native", async () => {
  const { createElement: element, useImperativeHandle } = await import("react");
  // The mock factory must own this helper because Vitest hoists it.
  // oxlint-disable-next-line unicorn/consistent-function-scoping
  function flatten(style: unknown): object {
    if (Array.isArray(style)) {
      return Object.assign({}, ...style.map(flatten));
    }
    return typeof style === "object" && style !== null ? Object.assign({}, style) : {};
  }
  type NativeProps = {
    children?: ReactNode;
    style?: unknown;
    onLayout?: (event: Layout) => void;
    onContentSizeChange?: (width: number, height: number) => void;
    horizontal?: boolean;
    ref?: Ref<{ scrollTo: typeof state.scrollTo }>;
  };
  function View({ children, style, onLayout }: NativeProps) {
    return element(
      "div",
      {
        style: flatten(style),
        ref: (node: HTMLDivElement | null) => {
          if (node && onLayout) {
            state.layouts.set(node, onLayout);
          }
        },
      },
      children
    );
  }
  function Text({ children, style }: NativeProps) {
    return element("span", { style: flatten(style) }, children);
  }
  function ScrollView({
    children,
    style,
    onLayout,
    onContentSizeChange,
    ref,
    horizontal,
  }: NativeProps) {
    useImperativeHandle(ref, () => ({ scrollTo: state.scrollTo }), []);
    return element(
      "div",
      {
        "data-scroll-view": horizontal ? "horizontal" : "vertical",
        style: flatten(style),
        ref: (node: HTMLDivElement | null) => {
          if (node && onLayout) {
            state.layouts.set(node, onLayout);
          }
          if (node && onContentSizeChange) {
            state.sizes.set(node, onContentSizeChange);
          }
        },
      },
      children
    );
  }
  return {
    View,
    Text,
    ScrollView,
    Pressable: View,
    TouchableHighlight: View,
    FlatList: View,
    ActivityIndicator: View,
    Image: View,
    ImageBackground: View,
    StyleSheet: { create: (styles: unknown) => styles, flatten },
    Dimensions: { get: () => ({ width: 400, height: 800 }) },
    Platform: {
      OS: "android",
      select: (options: Record<string, unknown>) => options.android ?? options.default,
    },
    I18nManager: { isRTL: false },
    Linking: { openURL: vi.fn() },
    useColorScheme: () => "light",
  };
});
vi.mock("react-native-svg", () => ({ SvgFromXml: () => null }));
vi.mock("react-native-reanimated-table", () => ({
  Cell: () => null,
  Table: () => null,
  TableWrapper: () => null,
}));
vi.mock("expo-symbols", () => ({ SymbolView: () => null }));
vi.mock("@/shared/presentation/theme", async () => {
  const { getAppColors } = await import("@/shared/presentation/theme-colors");
  const colors = getAppColors("light");
  return { useAppTheme: () => ({ colors, resolvedScheme: "light" }) };
});
vi.mock("@/features/decks/presentation/controllers/use-deck-metadata", () => ({
  useDeckMetadata: () => ({ themeSelections: new Map() }),
}));
vi.mock("@/features/lessons/presentation/controllers/use-lesson-sheet-height", () => ({
  useLessonSheetHeight: () => 600,
}));
vi.mock("@/features/lessons/presentation/controllers/use-lesson", () => ({
  useLesson: () => ({ lesson: state.lesson, loading: false }),
}));
vi.mock("@/shared/errors/report-error", () => ({ reportError: state.reportError }));

import { LessonArticle } from "@/features/lessons/presentation/components/lesson-article";
import { SheetLessonReader } from "@/features/lessons/presentation/components/sheet-lesson-reader";
import { sizes } from "@/shared/presentation/sizes";

function fixture() {
  return new LessonEntity({
    id: "lesson",
    deckId: "deck",
    order: 0,
    title: "Article",
    intro: "Introduction.",
    sections: [
      {
        id: "first",
        title: "First section",
        body: "**Bold** and *italic* with `inline`.\n\n3. Numbered item\n4. Next item\n\n```md\n# Heading inside code\n```",
      },
      { id: "target", title: "Target section", body: "Target body." },
      { id: "last", title: "Last section", body: "Last body." },
    ],
  });
}
function layout(y: number, height = 600): Layout {
  return { nativeEvent: { layout: { y, height, width: 400, x: 0 } } };
}
function sectionContainer(title: string) {
  const node = screen.getByText(title).parentElement;
  if (!node) {
    throw new Error("Missing section container");
  }
  return node;
}

beforeEach(() => {
  state.layouts.clear();
  state.sizes.clear();
  state.scrollTo.mockClear();
  state.reportError.mockClear();
  state.lesson = fixture();
});
afterEach(cleanup);

describe("lesson reader with the real Markdown hook and renderer", () => {
  it("renders a continuous article and highlights only the target heading and body", () => {
    const lesson = fixture();
    const onTargetLayout = vi.fn();
    const onDocumentLayout = vi.fn();
    render(
      createElement(LessonArticle, {
        lesson,
        targetSectionId: "target",
        sectionColor: "#00ccff",
        onTargetLayout,
        onDocumentLayout,
      })
    );
    expect(screen.getByText("Introduction.")).toBeTruthy();
    expect(screen.getByText("Bold")).toBeTruthy();
    expect(screen.getByText("inline")).toBeTruthy();
    expect(screen.getByText("# Heading inside code")).toBeTruthy();
    expect(screen.getByText("Numbered item")).toBeTruthy();
    const target = sectionContainer("Target section");
    const first = sectionContainer("First section");
    const last = sectionContainer("Last section");
    expect(first.parentElement).toBe(target.parentElement);
    expect(last.parentElement).toBe(target.parentElement);
    expect(target.textContent).toContain("Target body.");
    expect(target.style.borderLeftWidth).toBe("3px");
    expect(first.style.borderLeftWidth).toBe("");
    expect(last.style.borderLeftWidth).toBe("");
    expect(state.layouts.has(first)).toBe(false);
    expect(state.layouts.has(last)).toBe(false);
    act(() => {
      state.layouts.get(target)?.(layout(180));
      if (target.parentElement) {
        state.layouts.get(target.parentElement)?.(layout(40));
      }
    });
    expect(onTargetLayout).toHaveBeenCalledWith(180);
    expect(onDocumentLayout).toHaveBeenCalledWith(40);
  });

  it("positions once after layout and preserves subsequent user scrolling", () => {
    render(
      createElement(SheetLessonReader, {
        deckId: "deck",
        sectionId: "target",
        lesson: { id: "lesson", title: "Article", order: 0 },
        nextLesson: undefined,
        onBack: vi.fn(),
        onClose: vi.fn(),
        onOpenLesson: vi.fn(),
      })
    );
    const target = sectionContainer("Target section");
    const article = target.parentElement;
    const scroll = document.querySelector<HTMLElement>('[data-scroll-view="vertical"]');
    if (!article || !scroll) {
      throw new Error("Missing reader layout");
    }
    act(() => {
      state.layouts.get(target)?.(layout(320));
      state.layouts.get(article)?.(layout(40));
      state.layouts.get(scroll)?.(layout(0, 600));
      state.sizes.get(scroll)?.(400, 1400);
    });
    expect(state.scrollTo).toHaveBeenCalledExactlyOnceWith({
      y: 360 - sizes.spacing.medium,
      animated: false,
    });
    act(() => {
      state.layouts.get(target)?.(layout(340));
      state.sizes.get(scroll)?.(400, 1500);
    });
    expect(state.scrollTo).toHaveBeenCalledTimes(1);
  });

  it.each([null, "missing"])("starts at the top with no highlight for target %s", (sectionId) => {
    render(
      createElement(SheetLessonReader, {
        deckId: "deck",
        sectionId,
        lesson: { id: "lesson", title: "Article", order: 0 },
        nextLesson: undefined,
        onBack: vi.fn(),
        onClose: vi.fn(),
        onOpenLesson: vi.fn(),
      })
    );
    expect(screen.queryByText("Related section")).toBeNull();
    expect(state.scrollTo).not.toHaveBeenCalled();
    expect(state.reportError).toHaveBeenCalledTimes(sectionId === null ? 0 : 1);
  });
});
