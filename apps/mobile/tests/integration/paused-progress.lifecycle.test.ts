/** @vitest-environment jsdom */
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
const harness = vi.hoisted(() => ({ services: undefined as unknown, toast: vi.fn() }));
vi.mock("@/infrastructure/app-services", () => ({ useAppServices: () => harness.services }));
vi.mock("expo-router", () => ({
  useFocusEffect: (effect: () => void | (() => void)) => useEffect(effect, [effect]),
}));
vi.mock("@/shared/presentation/flashcard-toast", () => ({
  showSuccessToast: harness.toast,
  showErrorToast: vi.fn(),
}));
vi.mock("@/shared/errors/report-error", () => ({ reportError: vi.fn() }));

import { SavedProgressServiceImpl } from "@/features/decks/application/saved-progress.service.impl";
import { SQLiteArchivedProgressQuery } from "@/features/decks/infrastructure/sqlite-archived-progress.query";
import { SQLiteDeckProgressRepository } from "@/features/decks/infrastructure/sqlite-deck-progress.repository";
import { SQLiteSavedProgressContinuationTransaction } from "@/features/decks/infrastructure/sqlite-saved-progress-continuation.transaction";
import { SQLiteSavedProgressDeletionTransaction } from "@/features/decks/infrastructure/sqlite-saved-progress-deletion.transaction";
import { usePausedDeckProgress } from "@/features/decks/presentation/controllers/use-paused-deck-progress";
import { deckProgress } from "@/infrastructure/sqlite/schema";

import { deferred } from "../support/deferred";
import { NodeSqliteDatabase } from "../support/node-sqlite-database";
import { createQueryWrapper } from "../support/query-client";
import { seedDeck } from "../support/sqlite-study-scenario";
import { TEST_DECK_ID, testId } from "../support/study-fixtures";

afterEach(cleanup);
describe("paused progress actions", () => {
  it("runs only one continuation for two taps before a render", async () => {
    const database = new NodeSqliteDatabase();
    try {
      await seedDeck(database, TEST_DECK_ID, [testId(1)]);
      await database.drizzle.insert(deckProgress).values({
        id: testId(10),
        deckId: TEST_DECK_ID,
        lastReviewedAt: "2026-01-01T00:00:00.000Z",
        title: "Fixture",
        revision: 1,
        status: "pending",
      });
      const transaction = new SQLiteSavedProgressContinuationTransaction(database.drizzle);
      const service = new SavedProgressServiceImpl(
        new SQLiteArchivedProgressQuery(database.drizzle),
        new SQLiteDeckProgressRepository(database.drizzle),
        new SQLiteSavedProgressDeletionTransaction(database.drizzle),
        transaction
      );
      const release = deferred<void>();
      const continueProgress = transaction.continueProgress.bind(transaction);
      const continuation = vi
        .spyOn(transaction, "continueProgress")
        .mockImplementation(async (id) => {
          await release.promise;
          await continueProgress(id);
        });
      harness.services = { savedProgressService: service };
      const hook = renderHook(() => usePausedDeckProgress({ suspendPrompt: false }), {
        wrapper: createQueryWrapper(),
      });
      await waitFor(() => expect(hook.result.current.selected?.deckId).toBe(TEST_DECK_ID));
      act(() => {
        hook.result.current.continueProgress();
        hook.result.current.continueProgress();
      });
      await waitFor(() => expect(continuation).toHaveBeenCalled());
      await act(async () => {
        release.resolve();
      });
      await waitFor(() => expect(hook.result.current.busy).toBe(false));
      expect(continuation).toHaveBeenCalledOnce();
      expect(hook.result.current.error).toBeNull();
      expect(hook.result.current.selected).toBeNull();
      expect(await service.listPendingProgress()).toEqual([]);
    } finally {
      cleanup();
      database.close();
    }
  });
});
