import { eq } from "drizzle-orm";
import { strToU8, zipSync } from "fflate";
import { afterEach, describe, expect, it } from "vitest";

import type { DeckInstallResult } from "@/features/decks/deck-installer";
import type {
  DeckAudioStorage,
  DeckPackage,
  DeckPackageInstallationTransaction,
  StagedDeckAudio,
} from "@/features/decks/deck-installer/internal/deck-package.model";
import type { StudySessionSettlement } from "@/features/study/application/study-session-settlement";

import { ArchiveDeckPackageReader } from "@/features/decks/deck-installer/internal/archive-deck-package.reader";
import { DeckInstallerImpl } from "@/features/decks/deck-installer/internal/deck-installer";
import { DECK_PACKAGE_LIMITS } from "@/features/decks/deck-installer/internal/deck-package-limits";
import { DeckPackageSchema } from "@/features/decks/deck-installer/internal/deck-package.schema";
import { SQLiteDeckPackageInstallationTransaction } from "@/features/decks/deck-installer/internal/sqlite-deck-package-installation.transaction";
import { SQLiteDeckRepository } from "@/features/decks/infrastructure/sqlite-deck.repository";
import { SQLiteFlashcardAvailabilityQuery } from "@/features/flashcards/infrastructure/sqlite-flashcard-availability.query";
import { SQLiteFlashcardRepository } from "@/features/flashcards/infrastructure/sqlite-flashcard.repository";
import {
  deckAppearances,
  flashcardMemoryStates,
  flashcardReviewAttempts,
} from "@/infrastructure/sqlite/schema";

import { NodeSqliteDatabase } from "../support/node-sqlite-database";
import { createScenarioGraph, type ScenarioGraph } from "../support/sqlite-study-scenario";
import {
  OTHER_DECK_ID,
  SequenceIdGenerator,
  TEST_DECK_ID,
  TestClock,
  testId,
} from "../support/study-fixtures";

const timestamp = "2026-01-01T00:00:00.000Z";

class MemoryAudioStorage implements DeckAudioStorage {
  readonly staged: StagedDeckAudio[] = [];
  readonly activated: StagedDeckAudio[] = [];
  readonly removedVersions: string[] = [];
  readonly removedOtherVersions: string[] = [];
  readonly activeVersions = new Set<string>();
  private nextToken = 0;

  async stage(deckPackage: DeckPackage): Promise<StagedDeckAudio> {
    const staged = {
      deckId: deckPackage.id,
      token: `audio-${++this.nextToken}`,
      version: deckPackage.version,
    };
    this.staged.push(staged);
    return staged;
  }

  async activate(staged: StagedDeckAudio): Promise<void> {
    this.activated.push(staged);
    this.activeVersions.add(`${staged.deckId}:${staged.version}`);
  }

  async removeVersion(deckId: string, version: number): Promise<void> {
    this.removedVersions.push(`${deckId}:${version}`);
    this.activeVersions.delete(`${deckId}:${version}`);
  }

  async removeOtherVersions(deckId: string, keepVersion: number): Promise<void> {
    this.removedOtherVersions.push(`${deckId}:${keepVersion}`);
    for (const activeVersion of this.activeVersions) {
      if (activeVersion.startsWith(`${deckId}:`) && activeVersion !== `${deckId}:${keepVersion}`) {
        this.activeVersions.delete(activeVersion);
      }
    }
  }
}

class FailingInstallation implements DeckPackageInstallationTransaction {
  async install(_deckPackage: DeckPackage, _now: string): Promise<DeckInstallResult> {
    throw new Error("database installation failed");
  }
}

class CountingInstallation implements DeckPackageInstallationTransaction {
  calls = 0;
  private readonly delegate: DeckPackageInstallationTransaction;

  constructor(delegate: DeckPackageInstallationTransaction) {
    this.delegate = delegate;
  }

  async install(deckPackage: DeckPackage, now: string): Promise<DeckInstallResult> {
    this.calls += 1;
    return this.delegate.install(deckPackage, now);
  }
}

class CleanupFailingAudioStorage extends MemoryAudioStorage {
  override async removeOtherVersions(deckId: string, keepVersion: number): Promise<void> {
    this.removedOtherVersions.push(`${deckId}:${keepVersion}`);
    throw new Error("obsolete audio cleanup failed");
  }
}

class ActivatedCleanupFailingAudioStorage extends MemoryAudioStorage {
  failRemoval = true;

  override async removeVersion(deckId: string, version: number): Promise<void> {
    this.removedVersions.push(`${deckId}:${version}`);
    if (this.failRemoval) {
      this.failRemoval = false;
      throw new Error("activated audio cleanup failed");
    }
    this.activeVersions.delete(`${deckId}:${version}`);
  }
}

class GatedInstallation implements DeckPackageInstallationTransaction {
  readonly entered: Promise<void>;
  private signalEntered = () => {};
  private releaseGate = () => {};
  private readonly gate: Promise<void>;
  private readonly delegate: DeckPackageInstallationTransaction;
  private readonly gatedDeckId: string;

  constructor(delegate: DeckPackageInstallationTransaction, gatedDeckId = TEST_DECK_ID) {
    this.delegate = delegate;
    this.gatedDeckId = gatedDeckId;
    this.entered = new Promise((resolve) => {
      this.signalEntered = resolve;
    });
    this.gate = new Promise((resolve) => {
      this.releaseGate = resolve;
    });
  }

  async install(deckPackage: DeckPackage, now: string): Promise<DeckInstallResult> {
    if (deckPackage.id === this.gatedDeckId) {
      this.signalEntered();
      await this.gate;
    }
    return this.delegate.install(deckPackage, now);
  }

  release(): void {
    this.releaseGate();
  }
}

function rawDeck(
  version: number,
  cards: readonly DeckPackage["cards"][number][] = [],
  id = TEST_DECK_ID
) {
  return {
    cards,
    createdAt: timestamp,
    description: "Scenario deck",
    id,
    title: "Scenario deck",
    updatedAt: new Date(Date.parse(timestamp) + version * 60_000).toISOString(),
    version,
  };
}

function deck(
  version: number,
  cards: readonly DeckPackage["cards"][number][] = [],
  id = TEST_DECK_ID
) {
  return DeckPackageSchema.parse(rawDeck(version, cards, id));
}

function card(id: string, order: number, answer = `Answer ${id}`) {
  return {
    answer,
    createdAt: timestamp,
    id,
    order,
    question: `Question ${id}`,
    updatedAt: timestamp,
  };
}

function archive(
  packageDocument: unknown,
  audio: Readonly<Record<string, Uint8Array>> = {}
): Uint8Array {
  return zipSync({ "deck.json": strToU8(JSON.stringify(packageDocument)), ...audio });
}

function validArchive(
  version: number,
  cards: readonly DeckPackage["cards"][number][],
  id = TEST_DECK_ID
) {
  const audio: Record<string, Uint8Array> = {};
  for (const candidate of cards) {
    audio[`audio/${candidate.id}.answer.mp3`] = new Uint8Array([1, 2, 3]);
  }
  return archive(deck(version, cards, id), audio);
}

function archiveWithTooManyCards(): Uint8Array {
  const cards = Array.from({ length: DECK_PACKAGE_LIMITS.maximumCardCount + 1 }, (_, order) =>
    card(`10000000-0000-4000-8000-${order.toString(16).padStart(12, "0")}`, order)
  );
  return archive(rawDeck(2, cards));
}

function archiveWithTooManyAudioFiles(): Uint8Array {
  const entries: Record<string, Uint8Array> = {};
  for (let index = 0; index <= DECK_PACKAGE_LIMITS.maximumAudioFileCount; index += 1) {
    const id = `20000000-0000-4000-8000-${index.toString(16).padStart(12, "0")}`;
    entries[`audio/${id}.answer.mp3`] = new Uint8Array([1]);
  }
  return archive(deck(2), entries);
}

function createImporter(
  database: NodeSqliteDatabase,
  clock: TestClock,
  audio = new MemoryAudioStorage(),
  installation: DeckPackageInstallationTransaction = new SQLiteDeckPackageInstallationTransaction(
    database.drizzle
  ),
  sessionSettlement: StudySessionSettlement | null = null
) {
  const deckRepository = new SQLiteDeckRepository(database.drizzle);
  return {
    audio,
    importer: new DeckInstallerImpl(
      new ArchiveDeckPackageReader(),
      installation,
      audio,
      clock,
      { read: async () => new Uint8Array() },
      deckRepository,
      sessionSettlement
    ),
  };
}

async function reviewCard(
  graph: ScenarioGraph,
  database: NodeSqliteDatabase,
  cardId: string,
  complete = true
): Promise<string> {
  const cardRepository = new SQLiteFlashcardRepository(database.drizzle);
  const flashcard = await cardRepository.findById(cardId);
  if (!flashcard) {
    throw new Error(`Missing scenario card ${cardId}`);
  }
  const feed = await graph.feed.prepareFeed([flashcard], "focused", TEST_DECK_ID, false);
  const attemptId = await graph.study.startAttempt(cardId, 0, feed.studySessionId);
  await graph.study.rateAttempt(attemptId, "good");
  if (complete) {
    await graph.study.completeSession(feed.studySessionId);
  }
  return feed.studySessionId;
}

describe("deck package installation", () => {
  let database: NodeSqliteDatabase | null = null;

  afterEach(() => database?.close());

  it("installs cards and audio, then updates content without losing learner history", async () => {
    database = new NodeSqliteDatabase();
    const clock = new TestClock();
    const graph = createScenarioGraph(database, clock, new SequenceIdGenerator());
    const { audio, importer } = createImporter(database, clock);
    const cardA = card(testId(1), 0);
    const cardB = card(testId(2), 1);

    const initialInstall = await importer.installFromBytes(validArchive(1, [cardA, cardB]));
    expect(initialInstall.status).toBe("installed");
    expect(
      await database.drizzle
        .select({ presetId: deckAppearances.presetId })
        .from(deckAppearances)
        .where(eq(deckAppearances.deckId, TEST_DECK_ID))
    ).toEqual([{ presetId: "graphite" }]);
    expect(audio.staged).toHaveLength(1);
    expect(audio.activated).toHaveLength(1);
    const sessionId = await reviewCard(graph, database, cardA.id, false);
    const updatedA = card(cardA.id, 1, "Changed answer");
    const cardC = card(testId(3), 0);

    const updatedInstall = await importer.installFromBytes(validArchive(2, [updatedA, cardC]));
    expect(updatedInstall.status).toBe("updated");
    expect(audio.removedOtherVersions).toContain(`${TEST_DECK_ID}:2`);
    const completedSession = await graph.sessions.findById(sessionId);
    expect(completedSession?.completedAt).not.toBeNull();
    await graph.study.recoverPendingCompletedSessionAggregation();
    const repository = new SQLiteFlashcardRepository(database.drizzle);
    expect(
      await new SQLiteFlashcardAvailabilityQuery(database.drizzle).listAvailableFlashcardsByDeckId(
        TEST_DECK_ID
      )
    ).toMatchObject([
      { id: cardC.id, active: true, order: 0 },
      { id: cardA.id, active: true, answer: "Changed answer", order: 1 },
    ]);
    const updatedCard = await repository.findById(cardA.id);
    expect(updatedCard?.createdAt).toBe(timestamp);
    expect(await repository.findById(cardB.id)).toMatchObject({ active: false });
    expect(
      await database.getFirstAsync(
        "SELECT review_count FROM flashcard_progress WHERE flashcard_id = ?",
        cardA.id
      )
    ).toEqual({ review_count: 1 });
    expect(
      await database.getFirstAsync(
        "SELECT COUNT(*) AS count FROM flashcard_progress WHERE flashcard_id = ?",
        cardC.id
      )
    ).toEqual({ count: 0 });
  });

  it("reactivates a removed card, preserves history, and avoids staging for same-version imports", async () => {
    database = new NodeSqliteDatabase();
    const clock = new TestClock();
    const graph = createScenarioGraph(database, clock, new SequenceIdGenerator());
    const { audio, importer } = createImporter(database, clock);
    const removedCard = card(testId(4), 0);

    await importer.installFromBytes(validArchive(1, [removedCard]));
    await reviewCard(graph, database, removedCard.id);
    await graph.study.recoverPendingCompletedSessionAggregation();
    await importer.installFromBytes(validArchive(2, []));
    expect(
      await database.getFirstAsync("SELECT active FROM flashcards WHERE id = ?", removedCard.id)
    ).toEqual({ active: 0 });
    expect(
      await database.getFirstAsync(
        "SELECT COUNT(*) AS count FROM flashcard_review_attempts WHERE flashcard_id = ?",
        removedCard.id
      )
    ).toEqual({ count: 1 });
    const stagedBeforeNoOp = audio.staged.length;
    const noOpInstall = await importer.installFromBytes(validArchive(2, [removedCard]));
    expect(noOpInstall.status).toBe("no-op");
    expect(audio.staged).toHaveLength(stagedBeforeNoOp);
    await expect(importer.installFromBytes(validArchive(1, [removedCard]))).rejects.toThrow(
      "older"
    );
    const replacementCard = card(testId(21), 0);
    await importer.installFromBytes(validArchive(3, [replacementCard]));
    expect(
      await database.getFirstAsync(
        "SELECT COUNT(*) AS count FROM flashcard_progress WHERE flashcard_id = ?",
        replacementCard.id
      )
    ).toEqual({ count: 0 });
    await importer.installFromBytes(validArchive(4, [removedCard]));
    expect(
      await new SQLiteFlashcardRepository(database.drizzle).findById(removedCard.id)
    ).toMatchObject({ active: true });
    expect(
      await database.getFirstAsync(
        "SELECT review_count FROM flashcard_progress WHERE flashcard_id = ?",
        removedCard.id
      )
    ).toEqual({ review_count: 1 });
  });

  it("activates new audio before SQLite and removes it when installation fails", async () => {
    database = new NodeSqliteDatabase();
    const clock = new TestClock();
    const audio = new MemoryAudioStorage();
    const normal = createImporter(database, clock, audio);
    const existingCard = card(testId(12), 0);
    await normal.importer.installFromBytes(validArchive(1, [existingCard]));
    const failing = createImporter(database, clock, audio, new FailingInstallation());

    await expect(
      failing.importer.installFromBytes(validArchive(2, [existingCard]))
    ).rejects.toThrow("database installation failed");
    expect(audio.activeVersions).toEqual(new Set([`${TEST_DECK_ID}:1`]));
    expect(
      await database.getFirstAsync("SELECT version FROM decks WHERE id = ?", TEST_DECK_ID)
    ).toEqual({ version: 1 });
  });

  it("keeps a successful install when obsolete-audio cleanup fails", async () => {
    database = new NodeSqliteDatabase();
    const clock = new TestClock();
    const audio = new CleanupFailingAudioStorage();
    const { importer } = createImporter(database, clock, audio);
    const existingCard = card(testId(19), 0);

    await importer.installFromBytes(validArchive(1, [existingCard]));
    await expect(
      importer.installFromBytes(validArchive(2, [card(existingCard.id, 0, "Still usable")]))
    ).resolves.toMatchObject({ status: "updated", version: 2 });
    expect(audio.activeVersions).toEqual(new Set([`${TEST_DECK_ID}:1`, `${TEST_DECK_ID}:2`]));
    expect(
      await database.getFirstAsync("SELECT version FROM decks WHERE id = ?", TEST_DECK_ID)
    ).toEqual({ version: 2 });
  });

  it("retries after database and activated-audio cleanup both fail", async () => {
    database = new NodeSqliteDatabase();
    const clock = new TestClock();
    const audio = new ActivatedCleanupFailingAudioStorage();
    const candidate = validArchive(1, [card(testId(22), 0)]);
    const failing = createImporter(database, clock, audio, new FailingInstallation());

    await expect(failing.importer.installFromBytes(candidate)).rejects.toThrow(
      "database installation failed"
    );
    expect(audio.activeVersions).toContain(`${TEST_DECK_ID}:1`);
    expect(
      await database.getFirstAsync("SELECT version FROM decks WHERE id = ?", TEST_DECK_ID)
    ).toBeNull();

    const retry = createImporter(database, clock, audio);
    await expect(retry.importer.installFromBytes(candidate)).resolves.toMatchObject({
      status: "installed",
      version: 1,
    });
    expect(audio.activeVersions).toEqual(new Set([`${TEST_DECK_ID}:1`]));
  });

  it("performs no permanent work or session invalidation for a same-version import", async () => {
    database = new NodeSqliteDatabase();
    const clock = new TestClock();
    const graph = createScenarioGraph(database, clock, new SequenceIdGenerator());
    const audio = new MemoryAudioStorage();
    const delegate = new SQLiteDeckPackageInstallationTransaction(database.drizzle);
    const installation = new CountingInstallation(delegate);
    const { importer } = createImporter(database, clock, audio, installation);
    const existingCard = card(testId(20), 0);
    const bytes = validArchive(1, [existingCard]);
    await importer.installFromBytes(bytes);
    const installedCard = await new SQLiteFlashcardRepository(database.drizzle).findById(
      existingCard.id
    );
    if (!installedCard) {
      throw new Error("Missing installed card");
    }
    const focused = await graph.feed.prepareFeed([installedCard], "focused", TEST_DECK_ID, false);
    const countsBefore = {
      activated: audio.activated.length,
      installation: installation.calls,
      removedOtherVersions: audio.removedOtherVersions.length,
      removedVersions: audio.removedVersions.length,
      staged: audio.staged.length,
    };

    await expect(importer.installFromBytes(bytes)).resolves.toMatchObject({ status: "no-op" });
    expect({
      activated: audio.activated.length,
      installation: installation.calls,
      removedOtherVersions: audio.removedOtherVersions.length,
      removedVersions: audio.removedVersions.length,
      staged: audio.staged.length,
    }).toEqual(countsBefore);
    const focusedSession = await graph.sessions.findById(focused.studySessionId);
    expect(focusedSession?.completedAt).toBeNull();
  });

  it("serializes same-deck imports and rechecks the winning version inside the guard", async () => {
    database = new NodeSqliteDatabase();
    const clock = new TestClock();
    const graph = createScenarioGraph(database, clock, new SequenceIdGenerator());
    const audio = new MemoryAudioStorage();
    const initial = createImporter(database, clock, audio);
    const existingCard = card(testId(16), 0);
    await initial.importer.installFromBytes(validArchive(1, [existingCard]));
    await reviewCard(graph, database, existingCard.id);
    await graph.study.recoverPendingCompletedSessionAggregation();
    const gate = new GatedInstallation(
      new SQLiteDeckPackageInstallationTransaction(database.drizzle)
    );
    const { importer } = createImporter(database, clock, audio, gate);
    const update = validArchive(2, [card(existingCard.id, 0, "Concurrent winner")]);

    const first = importer.installFromBytes(update);
    await gate.entered;
    const second = importer.installFromBytes(update);
    await Promise.resolve();
    expect(audio.staged.filter((entry) => entry.version === 2)).toHaveLength(1);
    gate.release();

    const importResults = await Promise.all([first, second]);
    expect(new Set(importResults.map((result) => result.status))).toEqual(
      new Set(["no-op", "updated"])
    );
    expect(audio.activeVersions).toEqual(new Set([`${TEST_DECK_ID}:2`]));
    expect(
      await new SQLiteFlashcardRepository(database.drizzle).findById(existingCard.id)
    ).toMatchObject({ active: true, answer: "Concurrent winner" });
    expect(
      await database.getFirstAsync(
        "SELECT review_count FROM flashcard_progress WHERE flashcard_id = ?",
        existingCard.id
      )
    ).toEqual({ review_count: 1 });
  });

  it("allows imports for different deck IDs to proceed independently", async () => {
    database = new NodeSqliteDatabase();
    const clock = new TestClock();
    const gate = new GatedInstallation(
      new SQLiteDeckPackageInstallationTransaction(database.drizzle)
    );
    const audio = new MemoryAudioStorage();
    const { importer } = createImporter(database, clock, audio, gate);
    const blocked = importer.installFromBytes(validArchive(1, [card(testId(17), 0)]));
    await gate.entered;

    await expect(
      importer.installFromBytes(validArchive(1, [card(testId(18), 0)], OTHER_DECK_ID))
    ).resolves.toMatchObject({ deckId: OTHER_DECK_ID, status: "installed" });
    gate.release();
    await expect(blocked).resolves.toMatchObject({ deckId: TEST_DECK_ID, status: "installed" });
    expect(audio.activeVersions).toEqual(new Set([`${TEST_DECK_ID}:1`, `${OTHER_DECK_ID}:1`]));
  });

  it("completes active focused and mixed sessions when an installed deck changes", async () => {
    database = new NodeSqliteDatabase();
    const clock = new TestClock();
    const graph = createScenarioGraph(database, clock, new SequenceIdGenerator());
    const { importer } = createImporter(database, clock);
    const existingCard = card(testId(13), 0);
    await importer.installFromBytes(validArchive(1, [existingCard]));
    const repository = new SQLiteFlashcardRepository(database.drizzle);
    const installedCard = await repository.findById(existingCard.id);
    if (!installedCard) {
      throw new Error("Missing installed card");
    }
    const historicalSessionId = await reviewCard(graph, database, existingCard.id);
    const historicalBefore = await database.getFirstAsync(
      "SELECT completed_at FROM study_sessions WHERE id = ?",
      historicalSessionId
    );
    const finalizedAttemptBefore = await database.getFirstAsync(
      "SELECT finalized_at FROM flashcard_review_attempts WHERE study_session_id = ?",
      historicalSessionId
    );
    const focused = await graph.feed.prepareFeed([installedCard], "focused", TEST_DECK_ID, false);
    const mixed = await graph.feed.prepareFeed([installedCard], "mixed", null, false);

    await importer.installFromBytes(validArchive(2, [card(existingCard.id, 0, "Updated")]));
    const completedFocusedSession = await graph.sessions.findById(focused.studySessionId);
    const completedMixedSession = await graph.sessions.findById(mixed.studySessionId);
    expect(completedFocusedSession?.completedAt).not.toBeNull();
    expect(completedMixedSession?.completedAt).not.toBeNull();
    expect(
      await database.getFirstAsync(
        "SELECT completed_at FROM study_sessions WHERE id = ?",
        historicalSessionId
      )
    ).toEqual(historicalBefore);
    expect(
      await database.getFirstAsync(
        "SELECT finalized_at FROM flashcard_review_attempts WHERE study_session_id = ?",
        historicalSessionId
      )
    ).toEqual(finalizedAttemptBefore);
  });

  it("settles recent ratings through FSRS before an installed deck changes", async () => {
    database = new NodeSqliteDatabase();
    const clock = new TestClock();
    const graph = createScenarioGraph(database, clock, new SequenceIdGenerator());
    const installation = new SQLiteDeckPackageInstallationTransaction(database.drizzle);
    const { importer } = createImporter(
      database,
      clock,
      new MemoryAudioStorage(),
      installation,
      graph.study
    );
    const sourceCard = card(testId(19), 0);
    await importer.installFromBytes(validArchive(1, [sourceCard]));
    const installedCard = await new SQLiteFlashcardRepository(database.drizzle).findById(
      sourceCard.id
    );
    if (!installedCard) {
      throw new Error("Missing installed card");
    }
    const feed = await graph.feed.prepareFeed([installedCard], "focused", TEST_DECK_ID, false);
    const attemptId = await graph.study.startAttempt(
      installedCard.id,
      feed.currentReelPosition,
      feed.studySessionId
    );
    await graph.study.rateAttempt(attemptId, "good");

    await importer.installFromBytes(validArchive(2, [card(sourceCard.id, 0, "Updated")]));

    const completedSession = await graph.sessions.findById(feed.studySessionId);
    expect(completedSession?.completedAt).not.toBeNull();
    const finalizedRows = await database.drizzle
      .select({ finalizedAt: flashcardReviewAttempts.finalizedAt })
      .from(flashcardReviewAttempts)
      .where(eq(flashcardReviewAttempts.id, attemptId));
    expect(finalizedRows[0]?.finalizedAt).not.toBeNull();
    expect(
      await database.drizzle
        .select({ flashcardId: flashcardMemoryStates.flashcardId })
        .from(flashcardMemoryStates)
        .where(eq(flashcardMemoryStates.flashcardId, installedCard.id))
    ).toEqual([{ flashcardId: installedCard.id }]);
    expect(await graph.progress.findByFlashcardId(installedCard.id)).toMatchObject({
      reviewCount: 1,
    });
  });

  it("recovers and finalizes a completed import-invalidated session after interruption", async () => {
    database = new NodeSqliteDatabase();
    const clock = new TestClock();
    const graph = createScenarioGraph(database, clock, new SequenceIdGenerator());
    const { importer } = createImporter(database, clock);
    const sourceCard = card(testId(20), 0);
    await importer.installFromBytes(validArchive(1, [sourceCard]));
    const installedCard = await new SQLiteFlashcardRepository(database.drizzle).findById(
      sourceCard.id
    );
    if (!installedCard) {
      throw new Error("Missing installed card");
    }
    const feed = await graph.feed.prepareFeed([installedCard], "focused", TEST_DECK_ID, false);
    const attemptId = await graph.study.startAttempt(
      installedCard.id,
      feed.currentReelPosition,
      feed.studySessionId
    );
    await graph.study.rateAttempt(attemptId, "good");

    await importer.installFromBytes(validArchive(2, [card(sourceCard.id, 0, "Updated")]));
    expect(
      await database.drizzle
        .select({ finalizedAt: flashcardReviewAttempts.finalizedAt })
        .from(flashcardReviewAttempts)
        .where(eq(flashcardReviewAttempts.id, attemptId))
    ).toEqual([{ finalizedAt: null }]);

    await graph.study.recoverPendingCompletedSessionAggregation();

    const recoveredRows = await database.drizzle
      .select({ finalizedAt: flashcardReviewAttempts.finalizedAt })
      .from(flashcardReviewAttempts)
      .where(eq(flashcardReviewAttempts.id, attemptId));
    expect(recoveredRows[0]?.finalizedAt).not.toBeNull();
    expect(await graph.progress.findByFlashcardId(installedCard.id)).toMatchObject({
      reviewCount: 1,
    });
    expect(
      await database.drizzle
        .select({ flashcardId: flashcardMemoryStates.flashcardId })
        .from(flashcardMemoryStates)
        .where(eq(flashcardMemoryStates.flashcardId, installedCard.id))
    ).toEqual([{ flashcardId: installedCard.id }]);
  });

  it("settles a rated mixed session before installing a different new deck", async () => {
    database = new NodeSqliteDatabase();
    const clock = new TestClock();
    const graph = createScenarioGraph(database, clock, new SequenceIdGenerator());
    const installation = new SQLiteDeckPackageInstallationTransaction(database.drizzle);
    const { importer } = createImporter(
      database,
      clock,
      new MemoryAudioStorage(),
      installation,
      graph.study
    );
    const sourceCard = card(testId(21), 0);
    await importer.installFromBytes(validArchive(1, [sourceCard]));
    const installedCard = await new SQLiteFlashcardRepository(database.drizzle).findById(
      sourceCard.id
    );
    if (!installedCard) {
      throw new Error("Missing installed card");
    }
    const feed = await graph.feed.prepareFeed([installedCard], "mixed", null, false);
    const attemptId = await graph.study.startAttempt(
      installedCard.id,
      feed.currentReelPosition,
      feed.studySessionId
    );
    await graph.study.rateAttempt(attemptId, "good");

    await importer.installFromBytes(validArchive(1, [card(testId(22), 0)], OTHER_DECK_ID));

    const completedSession = await graph.sessions.findById(feed.studySessionId);
    expect(completedSession?.completedAt).not.toBeNull();
    expect(await graph.progress.findByFlashcardId(installedCard.id)).toMatchObject({
      reviewCount: 1,
    });
    expect(
      await database.drizzle
        .select({ flashcardId: flashcardMemoryStates.flashcardId })
        .from(flashcardMemoryStates)
        .where(eq(flashcardMemoryStates.flashcardId, installedCard.id))
    ).toEqual([{ flashcardId: installedCard.id }]);
  });

  it("does not settle an active session for a same-version no-op import", async () => {
    database = new NodeSqliteDatabase();
    const clock = new TestClock();
    const graph = createScenarioGraph(database, clock, new SequenceIdGenerator());
    const installation = new SQLiteDeckPackageInstallationTransaction(database.drizzle);
    const { importer } = createImporter(
      database,
      clock,
      new MemoryAudioStorage(),
      installation,
      graph.study
    );
    const sourceCard = card(testId(23), 0);
    const bytes = validArchive(1, [sourceCard]);
    await importer.installFromBytes(bytes);
    const installedCard = await new SQLiteFlashcardRepository(database.drizzle).findById(
      sourceCard.id
    );
    if (!installedCard) {
      throw new Error("Missing installed card");
    }
    const feed = await graph.feed.prepareFeed([installedCard], "focused", TEST_DECK_ID, false);

    await expect(importer.installFromBytes(bytes)).resolves.toMatchObject({ status: "no-op" });

    expect(await graph.sessions.findById(feed.studySessionId)).toMatchObject({
      completedAt: null,
    });
  });

  it("completes the active mixed session when a new deck is installed", async () => {
    database = new NodeSqliteDatabase();
    const clock = new TestClock();
    const graph = createScenarioGraph(database, clock, new SequenceIdGenerator());
    const { importer } = createImporter(database, clock);
    const sourceCard = card(testId(14), 0);
    await importer.installFromBytes(validArchive(1, [sourceCard]));
    const installedCard = await new SQLiteFlashcardRepository(database.drizzle).findById(
      sourceCard.id
    );
    if (!installedCard) {
      throw new Error("Missing installed card");
    }
    const mixed = await graph.feed.prepareFeed([installedCard], "mixed", null, false);
    const focused = await graph.feed.prepareFeed([installedCard], "focused", TEST_DECK_ID, false);

    await importer.installFromBytes(validArchive(1, [card(testId(15), 0)], OTHER_DECK_ID));
    const completedMixedSession = await graph.sessions.findById(mixed.studySessionId);
    const activeFocusedSession = await graph.sessions.findById(focused.studySessionId);
    expect(completedMixedSession?.completedAt).not.toBeNull();
    expect(activeFocusedSession?.completedAt).toBeNull();
  });

  it.each([
    ["malformed deck.json", zipSync({ "deck.json": strToU8("{") })],
    ["invalid deck ID", archive({ ...rawDeck(1), id: "not-a-uuid" })],
    ["invalid card ID", archive(rawDeck(1, [{ ...card(testId(5), 0), id: "bad" }]))],
    ["invalid deck version", archive({ ...rawDeck(1), version: 0 })],
    ["duplicate IDs", archive(rawDeck(1, [card(testId(5), 0), card(testId(5), 1)]))],
    ["non-contiguous order", archive(rawDeck(1, [card(testId(6), 1)]))],
    [
      "unexpected audio filename",
      archive(deck(1, [card(testId(7), 0)]), { "audio/a.mp3": new Uint8Array([1]) }),
    ],
    [
      "unknown audio card",
      archive(deck(1, [card(testId(8), 0)]), {
        [`audio/${testId(9)}.answer.mp3`]: new Uint8Array([1]),
      }),
    ],
    [
      "unsupported audio extension",
      archive(deck(1, [card(testId(8), 0)]), {
        [`audio/${testId(8)}.answer.wav`]: new Uint8Array([1]),
      }),
    ],
    [
      "unsafe archive path",
      archive(deck(1, [card(testId(10), 0)]), { "../escape.mp3": new Uint8Array([1]) }),
    ],
    ["missing required package file", zipSync({ "audio/orphan.answer.mp3": new Uint8Array([1]) })],
    ["card-count limit", archiveWithTooManyCards()],
    ["audio-count limit", archiveWithTooManyAudioFiles()],
    [
      "oversized audio resource",
      archive(deck(2, [card(testId(10), 0)]), {
        [`audio/${testId(10)}.answer.mp3`]: new Uint8Array(
          DECK_PACKAGE_LIMITS.maximumAudioFileBytes + 1
        ),
      }),
    ],
  ])("rejects %s before changing installed state", async (_name, bytes) => {
    database = new NodeSqliteDatabase();
    const clock = new TestClock();
    const { audio, importer } = createImporter(database, clock);
    await importer.installFromBytes(validArchive(1, [card(testId(11), 0)]));
    const audioBefore = {
      activeVersions: new Set(audio.activeVersions),
      activated: audio.activated.length,
      staged: audio.staged.length,
    };
    await expect(importer.installFromBytes(bytes)).rejects.toThrow();
    expect(
      await database.getFirstAsync("SELECT version FROM decks WHERE id = ?", TEST_DECK_ID)
    ).toEqual({ version: 1 });
    expect(audio.activeVersions).toEqual(audioBefore.activeVersions);
    expect(audio.activated).toHaveLength(audioBefore.activated);
    expect(audio.staged).toHaveLength(audioBefore.staged);
  });
});
