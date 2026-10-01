/** @vitest-environment jsdom */
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
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

import type { StudySession } from "@/features/study/domain/study-session.model";

import { DeckContentProvider } from "@/features/decks/presentation/context/deck-content-context";
import { LearningProgressRevisionProvider } from "@/features/flashcard-progress/presentation/context/learning-progress-revision-context";
import { useFocusedFeedLifecycle } from "@/features/reels/presentation/controllers/use-focused-feed-lifecycle";

import { deferred } from "../support/deferred";
import { NodeSqliteDatabase } from "../support/node-sqlite-database";
import { createScenarioGraph } from "../support/sqlite-study-scenario";
import { SequenceIdGenerator, TestClock } from "../support/study-fixtures";

type ProvidersProps = Readonly<{ children: ReactNode }>;
function Providers({ children }: ProvidersProps) {
  return createElement(
    DeckContentProvider,
    null,
    createElement(LearningProgressRevisionProvider, null, children)
  );
}
afterEach(cleanup);
describe("Focus foreground evaluation", () => {
  it("coalesces foreground events into one trailing evaluation", async () => {
    const database = new NodeSqliteDatabase();
    try {
      const graph = createScenarioGraph(database, new TestClock(), new SequenceIdGenerator());
      const initial = deferred<StudySession | null>();
      const resume = vi
        .spyOn(graph.study, "resumeFocusedSession")
        .mockReturnValueOnce(initial.promise);
      harness.services = { studyService: graph.runtime, deckService: {} };
      const evaluated = vi.fn();
      const failed = vi.fn();
      renderHook(() => useFocusedFeedLifecycle(evaluated, failed, 0, null), { wrapper: Providers });
      act(() => {
        harness.foreground?.("active");
        harness.foreground?.("active");
      });
      await act(async () => {
        initial.resolve(null);
      });
      await waitFor(() => expect(resume).toHaveBeenCalledTimes(2));
      expect(evaluated).toHaveBeenCalledTimes(2);
      expect(failed).not.toHaveBeenCalled();
    } finally {
      cleanup();
      database.close();
    }
  });
});
