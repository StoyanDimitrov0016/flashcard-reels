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
  useCallback: (callback: unknown) => callback,
  useRef: (current: unknown) => ({ current }),
  useEffect: (effect: () => () => void) => {
    harness.cleanup = effect();
  },
  useState: (initial: unknown) => {
    let current = initial;
    // The hook keeps only the delete error in state; busy comes from the single flight.
    const observesDeleteState = initial === null;
    if (observesDeleteState) {
      harness.state = current;
    }
    return [
      initial,
      (next: unknown) => {
        current = typeof next === "function" ? next(current) : next;
        if (observesDeleteState) {
          harness.state = current;
        }
      },
    ];
  },
}));
vi.mock("@/infrastructure/app-services", () => ({
  useAppServices: () => ({ deckService: { remove: harness.remove } }),
}));
vi.mock("@tanstack/react-query", () => ({ useQueryClient: () => ({}) }));
vi.mock("@/shared/presentation/query/query-scopes", () => ({
  invalidateChangedData: harness.content,
}));
vi.mock("@/shared/errors/report-error", () => ({ reportError: harness.report }));

import { useDeleteDeck } from "@/features/decks/presentation/controllers/use-delete-deck";

describe("deck deletion feedback lifetime", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    harness.cleanup = undefined;
    harness.remove.mockResolvedValue(undefined);
  });

  it("invalidates deck content and progress after successful deletion", async () => {
    await expect(useDeleteDeck().deleteDeck("deck")).resolves.toBe(true);
    expect(harness.content).toHaveBeenCalledExactlyOnceWith({}, [
      "deck-content",
      "learning-progress",
    ]);
    expect(harness.state).toBeNull();
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
    expect(harness.state).toMatchObject({ code: "DECK_OPERATION_FAILED" });
    hook.clearDeleteError();
    expect(harness.state).toBeNull();
  });
});
