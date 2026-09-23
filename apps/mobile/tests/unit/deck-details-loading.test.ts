import { beforeEach, describe, expect, it, vi } from "vitest";

// Unit harness for the loader effect and its state transitions, not a React renderer.
const harness = vi.hoisted(() => ({
  state: undefined as unknown,
  effect: undefined as (() => void | (() => void)) | undefined,
  findDeck: vi.fn(),
  cards: vi.fn(),
  appearance: vi.fn(),
  progress: vi.fn(),
}));
vi.mock("react", () => ({
  useEffect: (effect: () => void | (() => void)) => {
    harness.effect = effect;
  },
  useState: (initial: unknown) => [
    harness.state ?? initial,
    (next: unknown) => {
      harness.state = next;
    },
  ],
}));
vi.mock("@/infrastructure/app-services", () => ({
  useAppServices: () => ({
    deckService: { findById: harness.findDeck, getAppearance: harness.appearance },
    flashcardService: { listByDeckId: harness.cards },
    flashcardProgressService: { findByFlashcardIds: harness.progress },
  }),
}));
vi.mock("@/features/decks/presentation/context/deck-content-context", () => ({
  useDeckContentRevision: () => ({ revision: 1 }),
}));
vi.mock(
  "@/features/flashcard-progress/presentation/context/learning-progress-reset-context",
  () => ({
    useLearningProgressReset: () => ({ revision: 1 }),
  })
);

import { useDeckDetails } from "@/features/decks/presentation/controllers/use-deck-details";

describe("deck detail loading after content changes", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    harness.state = undefined;
    harness.effect = undefined;
    harness.findDeck.mockResolvedValue(null);
    harness.cards.mockResolvedValue([]);
    harness.appearance.mockResolvedValue(null);
    harness.progress.mockResolvedValue(new Map());
  });

  it("returns an expected missing-deck state instead of throwing into a route boundary", async () => {
    useDeckDetails("deleted-deck");
    harness.effect?.();
    await vi.waitFor(() =>
      expect(harness.state).toMatchObject({ loading: false, deck: null, error: null })
    );
    expect(() => useDeckDetails("deleted-deck")).not.toThrow();
    expect(harness.progress).not.toHaveBeenCalled();
  });

  it("pauses detail reloads while deletion is running", () => {
    useDeckDetails("deleting-deck", false);
    harness.effect?.();
    expect(harness.findDeck).not.toHaveBeenCalled();
    expect(harness.cards).not.toHaveBeenCalled();
  });

  it("still raises genuine storage failures to the boundary", async () => {
    harness.findDeck.mockRejectedValue(new Error("database unavailable"));
    useDeckDetails("deck");
    harness.effect?.();
    await vi.waitFor(() =>
      expect(harness.state).toMatchObject({ loading: false, error: { code: "VIEW_LOAD_FAILED" } })
    );
    expect(() => useDeckDetails("deck")).toThrow("Could not load deck cards");
  });

  it("ignores a pending detail response after the effect is cancelled", async () => {
    let resolveDeck: ((deck: null) => void) | undefined;
    harness.findDeck.mockImplementation(
      () =>
        new Promise<null>((resolve) => {
          resolveDeck = resolve;
        })
    );
    useDeckDetails("deleting-deck");
    const cleanup = harness.effect?.();
    if (cleanup) {
      cleanup();
    }
    resolveDeck?.(null);
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(harness.state).toBeUndefined();
  });
});
