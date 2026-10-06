/** @vitest-environment jsdom */
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const harness = vi.hoisted(() => ({ services: undefined as unknown, success: vi.fn() }));
vi.mock("@/infrastructure/app-services", () => ({ useAppServices: () => harness.services }));
vi.mock("@/shared/presentation/flashcard-toast", () => ({ showSuccessToast: harness.success }));
vi.mock("@/shared/errors/report-error", () => ({ reportError: vi.fn() }));

import { ProgressBackupServiceImpl } from "@/features/progress-backup/application/progress-backup.service.impl";
import { SQLiteProgressBackupRestoreTransaction } from "@/features/progress-backup/infrastructure/sqlite-progress-backup-restore.transaction";
import { SQLiteProgressBackupQuery } from "@/features/progress-backup/infrastructure/sqlite-progress-backup.query";
import { useProgressBackupController } from "@/features/progress-backup/presentation/controllers/use-progress-backup-controller";
import { createQueryClient } from "@/shared/presentation/query/query-client";

import { deferred } from "../support/deferred";
import { MemoryBackupFiles } from "../support/memory-backup-files";
import { NodeSqliteDatabase } from "../support/node-sqlite-database";
import { createScenarioGraph, seedDeck } from "../support/sqlite-study-scenario";
import { SequenceIdGenerator, TestClock, TEST_DECK_ID, testId } from "../support/study-fixtures";

let database: NodeSqliteDatabase;
let client: QueryClient;
let files: MemoryBackupFiles;
let query: SQLiteProgressBackupQuery;

function Providers({ children }: Readonly<{ children: ReactNode }>) {
  return createElement(QueryClientProvider, { client }, children);
}

beforeEach(async () => {
  database = new NodeSqliteDatabase();
  client = createQueryClient();
  files = new MemoryBackupFiles();
  query = new SQLiteProgressBackupQuery(database.drizzle);
  harness.success.mockClear();
  const clock = new TestClock();
  await seedDeck(database, TEST_DECK_ID, [testId(1)]);
  // The selected backup is empty; the local learner has one pending Good review.
  files.picked = JSON.stringify(await query.read(clock.now()));
  const graph = createScenarioGraph(database, clock, new SequenceIdGenerator());
  const { session } = await graph.study.openSession("discover", null, false);
  const attempt = await graph.study.startAttempt(testId(1), 0, session.id);
  await graph.study.rateAttempt(attempt, "good");
  harness.services = {
    progressBackupService: new ProgressBackupServiceImpl(
      graph.runtime,
      query,
      new SQLiteProgressBackupRestoreTransaction(database.drizzle, database.rowIds),
      files,
      clock
    ),
  };
});

afterEach(() => {
  cleanup();
  client.clear();
  vi.restoreAllMocks();
  database.close();
});

it("opens only the export share sheet when Export and Import are tapped in the same frame", async () => {
  const entered = deferred<void>();
  const release = deferred<void>();
  const share = files.share.bind(files);
  const pick = vi.spyOn(files, "pick");
  vi.spyOn(files, "share").mockImplementationOnce(async (document) => {
    entered.resolve();
    await release.promise;
    return share(document);
  });
  const mounted = renderHook(useProgressBackupController, { wrapper: Providers });
  act(() => {
    mounted.result.current.exportProgress();
    mounted.result.current.pickBackup();
    mounted.result.current.exportProgress();
  });
  await entered.promise;
  expect(pick).not.toHaveBeenCalled();
  await act(async () => release.resolve());
  await waitFor(() => expect(mounted.result.current.busy).toBe(false));
  expect(files.shared?.flashcardReviewEvents.map((event) => event.rating)).toEqual(["good"]);
  expect(mounted.result.current.prepared).toBeNull();
  expect(mounted.result.current.error).toBeNull();
  // After the export finishes, Import can open normally.
  act(() => mounted.result.current.pickBackup());
  await waitFor(() => expect(mounted.result.current.prepared).not.toBeNull());
});

it("replaces progress once and keeps the original safety copy after repeated confirmation", async () => {
  const mounted = renderHook(useProgressBackupController, { wrapper: Providers });
  act(() => mounted.result.current.pickBackup());
  await waitFor(() => expect(mounted.result.current.prepared).not.toBeNull());
  const entered = deferred<void>();
  const release = deferred<void>();
  const save = files.saveSafetyCopy.bind(files);
  vi.spyOn(files, "saveSafetyCopy").mockImplementationOnce(async (document) => {
    entered.resolve();
    await release.promise;
    return save(document);
  });
  act(() => {
    mounted.result.current.restore();
    mounted.result.current.restore();
    mounted.result.current.shareSafetyCopy();
    mounted.result.current.cancelRestore();
  });
  await entered.promise;
  expect(mounted.result.current.prepared).not.toBeNull();
  await act(async () => release.resolve());
  await waitFor(() => expect(mounted.result.current.hasSafetyCopy).toBe(true));
  expect(files.copies.size).toBe(1);
  expect(files.safetyCopy?.flashcardReviewEvents.map((event) => event.rating)).toEqual(["good"]);
  const restored = await query.read("2026-01-01T00:00:00.000Z");
  expect(restored.flashcardReviewEvents).toEqual([]);
  expect(mounted.result.current.prepared).toBeNull();
  expect(harness.success).toHaveBeenCalledExactlyOnceWith("Learning progress restored.");
});

it("keeps backup actions blocked across a screen remount until the previous export finishes", async () => {
  const entered = deferred<void>();
  const release = deferred<void>();
  const share = files.share.bind(files);
  const pick = vi.spyOn(files, "pick");
  vi.spyOn(files, "share").mockImplementationOnce(async (document) => {
    entered.resolve();
    await release.promise;
    return share(document);
  });
  const first = renderHook(useProgressBackupController, { wrapper: Providers });
  act(() => first.result.current.exportProgress());
  await entered.promise;
  first.unmount();
  const second = renderHook(useProgressBackupController, { wrapper: Providers });
  expect(second.result.current.busy).toBe(true);
  act(() => second.result.current.pickBackup());
  expect(pick).not.toHaveBeenCalled();
  await act(async () => release.resolve());
  await waitFor(() => expect(second.result.current.busy).toBe(false));
  act(() => second.result.current.pickBackup());
  await waitFor(() => expect(second.result.current.prepared).not.toBeNull());
});

it("releases a failed export, shows its error, and preserves progress for a retry", async () => {
  vi.spyOn(files, "share").mockRejectedValueOnce(new Error("Sharing unavailable"));
  const mounted = renderHook(useProgressBackupController, { wrapper: Providers });
  act(() => mounted.result.current.exportProgress());
  await waitFor(() => expect(mounted.result.current.error).not.toBeNull());
  expect(mounted.result.current.busy).toBe(false);
  const saved = await query.read("2026-01-01T00:00:00.000Z");
  expect(saved.flashcardReviewEvents).toHaveLength(1);
  act(() => mounted.result.current.exportProgress());
  await waitFor(() => expect(files.shared?.flashcardReviewEvents).toHaveLength(1));
  expect(mounted.result.current.error).toBeNull();
});
