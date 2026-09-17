import { beforeEach, describe, expect, it, vi } from "vitest";

const harness = vi.hoisted(() => ({
  state: undefined as unknown,
  cleanup: undefined as (() => void) | undefined,
  remove: vi.fn(),
  content: vi.fn(),
  progress: vi.fn(),
  report: vi.fn(),
}));
vi.mock("react", () => ({
  useRef: (current: unknown) => ({ current }),
  useEffect: (effect: () => () => void) => {
    harness.cleanup = effect();
  },
  useState: (initial: unknown) => {
    harness.state = initial;
    return [
      initial,
      (next: unknown) => {
        harness.state = typeof next === "function" ? next(harness.state) : next;
      },
    ];
  },
}));
vi.mock("@/infrastructure/app-services", () => ({
  useAppServices: () => ({ deckService: { remove: harness.remove } }),
}));
vi.mock("@/features/decks/presentation/context/deck-content-context", () => ({
  useInvalidateDeckContent: () => harness.content,
}));
vi.mock("@/features/learner-profile/presentation/context/learning-progress-reset-context", () => ({
  useLearningProgressReset: () => ({ invalidateLearningProgress: harness.progress }),
}));
vi.mock("@/shared/presentation/errors/report-error", () => ({ reportError: harness.report }));

import { useDeleteDeck } from "@/features/decks/presentation/hooks/use-delete-deck";

describe("deck deletion feedback lifetime", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    harness.cleanup = undefined;
    harness.remove.mockResolvedValue(undefined);
  });

  it("invalidates deck content and progress after successful deletion", async () => {
    await expect(useDeleteDeck().deleteDeck("deck")).resolves.toBe(true);
    expect(harness.content).toHaveBeenCalledOnce();
    expect(harness.progress).toHaveBeenCalledOnce();
    expect(harness.state).toMatchObject({ deleting: false, error: null });
  });

  it("does not publish success or navigate from a screen that has already unmounted", async () => {
    let finishDelete: (() => void) | undefined;
    harness.remove.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finishDelete = resolve;
        })
    );
    const hook = useDeleteDeck();
    const result = hook.deleteDeck("deck");
    const lastMountedState = harness.state;
    harness.cleanup?.();
    finishDelete?.();
    await expect(result).resolves.toBe(false);
    expect(harness.content).toHaveBeenCalledOnce();
    expect(harness.progress).toHaveBeenCalledOnce();
    expect(harness.state).toBe(lastMountedState);
  });

  it("rejects duplicate deletes while the first is pending", async () => {
    let finishDelete: (() => void) | undefined;
    harness.remove.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finishDelete = resolve;
        })
    );
    const hook = useDeleteDeck();
    const first = hook.deleteDeck("deck");
    await expect(hook.deleteDeck("deck")).resolves.toBe(false);
    expect(harness.remove).toHaveBeenCalledOnce();
    finishDelete?.();
    await first;
  });

  it("keeps failure local and clears it on dismissal", async () => {
    harness.remove.mockRejectedValue(new Error("storage locked"));
    const hook = useDeleteDeck();
    await expect(hook.deleteDeck("deck")).resolves.toBe(false);
    expect(harness.content).not.toHaveBeenCalled();
    expect(harness.report).toHaveBeenCalledOnce();
    expect(harness.state).toMatchObject({
      deleting: false,
      error: { code: "DECK_OPERATION_FAILED" },
    });
    hook.clearDeleteError();
    expect(harness.state).toMatchObject({ error: null });
  });
});
