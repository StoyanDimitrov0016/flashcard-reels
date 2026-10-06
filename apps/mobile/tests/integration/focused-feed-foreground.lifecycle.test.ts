/** @vitest-environment jsdom */
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const harness = vi.hoisted(() => ({
  services: undefined as unknown,
  foreground: undefined as ((state: string) => void) | undefined,
}));
vi.mock("@/infrastructure/app-services", () => ({ useAppServices: () => harness.services }));
vi.mock("react-native", () => ({
  AppState: {
    addEventListener: (_event: string, listener: (state: string) => void) => {
      harness.foreground = listener;
      return { remove: vi.fn() };
    },
  },
}));

import {
  useFocusedFeedLifecycle,
  type FocusedFeedEvaluation,
} from "@/features/reels/presentation/controllers/use-focused-feed-lifecycle";

import { deferred } from "../support/deferred";
import { NodeSqliteDatabase } from "../support/node-sqlite-database";
import { createQueryWrapper } from "../support/query-client";
import { createScenarioGraph, seedDeck } from "../support/sqlite-study-scenario";
import {
  OTHER_DECK_ID,
  SequenceIdGenerator,
  TestClock,
  TEST_DECK_ID,
  testId,
} from "../support/study-fixtures";

afterEach(cleanup);
describe("Focus foreground evaluation", () => {
  it("reconciles a persisted Focus replacement on foreground without hiding the current feed", async () => {
    const database = new NodeSqliteDatabase();
    try {
      const graph = createScenarioGraph(database, new TestClock(), new SequenceIdGenerator());
      await seedDeck(database, TEST_DECK_ID, [testId(1)]);
      await seedDeck(database, OTHER_DECK_ID, [testId(2)]);
      const first = await graph.study.openSession("focus", TEST_DECK_ID, false);
      harness.services = { studyService: graph.runtime, deckService: {} };
      const evaluated = vi.fn<(evaluation: FocusedFeedEvaluation) => void>();
      const failed = vi.fn();
      const mounted = renderHook(() => useFocusedFeedLifecycle(evaluated, failed, null), {
        wrapper: createQueryWrapper(),
      });

      await waitFor(() =>
        expect(evaluated.mock.lastCall?.[0]).toMatchObject({
          session: { id: first.session.id, deckId: TEST_DECK_ID },
          requestedDeckAvailable: true,
        })
      );

      const replacement = await graph.study.openSession("focus", OTHER_DECK_ID, true);
      const entered = deferred<void>();
      const release = deferred<void>();
      const resume = graph.runtime.resumeFocusedSession.bind(graph.runtime);
      vi.spyOn(graph.runtime, "resumeFocusedSession").mockImplementationOnce(async () => {
        entered.resolve();
        await release.promise;
        return resume();
      });

      act(() => {
        harness.foreground?.("active");
      });
      await entered.promise;
      expect(mounted.result.current.evaluating).toBe(false);
      await act(async () => release.resolve());
      await waitFor(() =>
        expect(evaluated.mock.lastCall?.[0]).toMatchObject({
          session: { id: replacement.session.id, deckId: OTHER_DECK_ID },
          requestedDeckAvailable: true,
        })
      );
      expect(await graph.sessions.findActiveByScope("focus")).toMatchObject({
        id: replacement.session.id,
      });
      expect(failed).not.toHaveBeenCalled();
    } finally {
      cleanup();
      vi.restoreAllMocks();
      database.close();
    }
  });
});
