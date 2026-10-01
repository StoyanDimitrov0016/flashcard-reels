/** @vitest-environment jsdom */
import { renderHook } from "@testing-library/react";
import { expect, it, vi } from "vitest";

// Screens pass these callbacks to `useFocusEffect`; a new identity per render reruns the
// effect after every refresh and loops until React stops it ("Maximum update depth").
const services = vi.hoisted(() => {
  // Loads stay pending, so only the returned callbacks are compared.
  const never = new Promise<never>(() => undefined);
  return {
    deckService: { getCatalog: () => never, findWithThemes: () => never },
    flashcardService: { list: () => never },
    flashcardProgressService: { findByFlashcardIds: () => never },
  };
});
vi.mock("@/features/decks/presentation/dependencies/use-decks", () => ({
  useDecks: () => services,
}));
vi.mock("@/features/flashcard-progress/presentation/dependencies/use-flashcard-progress", () => ({
  useFlashcardProgress: () => services,
}));
vi.mock("@/features/decks/presentation/context/deck-content-context", () => ({
  useDeckContentRevision: () => ({ revision: 0 }),
}));
vi.mock("@/features/decks/presentation/context/deck-theme-selection-context", () => ({
  useDeckThemeSelectionRevision: () => ({ themeSelectionRevision: 0 }),
}));
vi.mock(
  "@/features/flashcard-progress/presentation/context/learning-progress-revision-context",
  () => ({ useLearningProgressRevision: () => ({ revision: 0 }) })
);

import { useDeckCatalog } from "@/features/decks/presentation/controllers/use-deck-catalog";
import { useFlashcardProgressList } from "@/features/flashcard-progress/presentation/controllers/use-flashcard-progress-list";

it.each([
  ["useDeckCatalog", useDeckCatalog],
  ["useFlashcardProgressList", useFlashcardProgressList],
] as const)("%s keeps one refresh identity across renders", (_name, useHook) => {
  const mounted = renderHook(() => useHook());
  const first = mounted.result.current.refresh;

  mounted.rerender();

  expect(mounted.result.current.refresh).toBe(first);
});
