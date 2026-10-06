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

import type { StudySession } from "@/features/study/domain/study-session.model";

import { useFocusedFeedLifecycle } from "@/features/reels/presentation/controllers/use-focused-feed-lifecycle";

import { deferred } from "../support/deferred";
import { NodeSqliteDatabase } from "../support/node-sqlite-database";
import { createQueryWrapper } from "../support/query-client";
import { createScenarioGraph } from "../support/sqlite-study-scenario";
import { SequenceIdGenerator, TestClock } from "../support/study-fixtures";

afterEach(cleanup);
describe("Focus foreground evaluation", () => {
  it("joins a running evaluation, then evaluates again on a later foreground", async () => {
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
      const mounted = renderHook(() => useFocusedFeedLifecycle(evaluated, failed, null), {
        wrapper: createQueryWrapper(),
      });

      act(() => {
        harness.foreground?.("active");
        harness.foreground?.("active");
      });
      await act(async () => {
        initial.resolve(null);
      });
      await waitFor(() => expect(mounted.result.current.evaluating).toBe(false));
      expect(resume).toHaveBeenCalledTimes(1);
      expect(evaluated).toHaveBeenCalledTimes(1);

      act(() => {
        harness.foreground?.("active");
      });
      await waitFor(() => expect(evaluated).toHaveBeenCalledTimes(2));
      expect(resume).toHaveBeenCalledTimes(2);
      // A foreground evaluation keeps the current feed instead of showing Focus as restoring.
      expect(mounted.result.current.evaluating).toBe(false);
      expect(failed).not.toHaveBeenCalled();
    } finally {
      cleanup();
      database.close();
    }
  });
});
