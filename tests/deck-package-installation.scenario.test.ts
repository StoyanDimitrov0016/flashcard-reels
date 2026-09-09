import { strToU8, zipSync } from "fflate";
import { afterEach, describe, expect, it } from "vitest";

import { DeckPackageImportService } from "@/features/decks/application/deck-package-import.service";
import { DeckPackageSchema } from "@/features/decks/contracts/deck-package.schema";
import type {
  DeckAudioStorage,
  DeckPackage,
  DeckPackageInstallationTransaction,
  DeckPackageInstallResult,
  StagedDeckAudio,
} from "@/features/decks/domain/deck-package.model";
import { ArchiveDeckPackageReader } from "@/features/decks/infrastructure/archive-deck-package.reader";
import { SQLiteDeckPackageInstallationTransaction } from "@/features/decks/infrastructure/sqlite-deck-package-installation.transaction";
import { SQLiteDeckRepository } from "@/features/decks/infrastructure/sqlite-deck.repository";
import { SQLiteFlashcardRepository } from "@/features/flashcards/infrastructure/sqlite-flashcard.repository";
import { NodeSqliteDatabase } from "./support/node-sqlite-database";
import { createScenarioGraph, type ScenarioGraph } from "./support/sqlite-study-scenario";
import {
  OTHER_DECK_ID,
  SequenceIdGenerator,
  TEST_DECK_ID,
  TestClock,
  testId,
} from "./support/study-test-support";

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
  async install(_deckPackage: DeckPackage, _now: string): Promise<DeckPackageInstallResult> {
    throw new Error("database installation failed");
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

function archive(rawDeck: unknown, audio: Readonly<Record<string, Uint8Array>> = {}): Uint8Array {
  return zipSync({ "deck.json": strToU8(JSON.stringify(rawDeck)), ...audio });
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

function createImporter(
  database: NodeSqliteDatabase,
  clock: TestClock,
  audio = new MemoryAudioStorage(),
  installation: DeckPackageInstallationTransaction =
    new SQLiteDeckPackageInstallationTransaction(database.drizzle)
) {
  const deckRepository = new SQLiteDeckRepository(database.drizzle);
  return {
    audio,
    importer: new DeckPackageImportService(
      new ArchiveDeckPackageReader(),
      installation,
      audio,
      clock,
      { read: async () => new Uint8Array() },
      deckRepository
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
  const feed = await graph.feed.prepareFeed([flashcard], "focused", TEST_DECK_ID, false, "ordered");
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

    expect((await importer.import(validArchive(1, [cardA, cardB]))).status).toBe("installed");
    expect(audio.staged).toHaveLength(1);
    expect(audio.activated).toHaveLength(1);
    const sessionId = await reviewCard(graph, database, cardA.id, false);
    const updatedA = card(cardA.id, 1, "Changed answer");
    const cardC = card(testId(3), 0);

    expect((await importer.import(validArchive(2, [updatedA, cardC]))).status).toBe("updated");
    expect(audio.removedOtherVersions).toContain(`${TEST_DECK_ID}:2`);
    expect((await graph.sessions.findById(sessionId))?.completedAt).not.toBeNull();
    await graph.study.recoverPendingCompletedSessionAggregation();
    const repository = new SQLiteFlashcardRepository(database.drizzle);
    expect(await repository.listByDeckId(TEST_DECK_ID)).toMatchObject([
      { id: cardC.id, active: true, order: 0 },
      { id: cardA.id, active: true, answer: "Changed answer", order: 1 },
    ]);
    expect((await repository.findById(cardA.id))?.createdAt).toBe(timestamp);
    expect(await repository.findById(cardB.id)).toMatchObject({ active: false });
    expect(
      await database.getFirstAsync(
        "SELECT review_count FROM learner_profiles WHERE flashcard_id = ?",
        cardA.id
      )
    ).toEqual({ review_count: 1 });
    expect(
      await database.getFirstAsync("SELECT COUNT(*) AS count FROM learner_profiles WHERE flashcard_id = ?", cardC.id)
    ).toEqual({ count: 0 });
  });

  it("reactivates a removed card, preserves history, and avoids staging for same-version imports", async () => {
    database = new NodeSqliteDatabase();
    const clock = new TestClock();
    const graph = createScenarioGraph(database, clock, new SequenceIdGenerator());
    const { audio, importer } = createImporter(database, clock);
    const removedCard = card(testId(4), 0);

    await importer.import(validArchive(1, [removedCard]));
    await reviewCard(graph, database, removedCard.id);
    await graph.study.recoverPendingCompletedSessionAggregation();
    await importer.import(validArchive(2, []));
    expect(await database.getFirstAsync("SELECT active FROM flashcards WHERE id = ?", removedCard.id)).toEqual({ active: 0 });
    const stagedBeforeNoOp = audio.staged.length;
    expect((await importer.import(validArchive(2, [removedCard]))).status).toBe("no-op");
    expect(audio.staged).toHaveLength(stagedBeforeNoOp);
    await expect(importer.import(validArchive(1, [removedCard]))).rejects.toThrow("older");
    await importer.import(validArchive(3, [removedCard]));
    expect(await new SQLiteFlashcardRepository(database.drizzle).findById(removedCard.id)).toMatchObject({ active: true });
    expect(await database.getFirstAsync("SELECT review_count FROM learner_profiles WHERE flashcard_id = ?", removedCard.id)).toEqual({ review_count: 1 });
  });

  it("activates new audio before SQLite and removes it when installation fails", async () => {
    database = new NodeSqliteDatabase();
    const clock = new TestClock();
    const audio = new MemoryAudioStorage();
    const normal = createImporter(database, clock, audio);
    const existingCard = card(testId(12), 0);
    await normal.importer.import(validArchive(1, [existingCard]));
    const failing = createImporter(database, clock, audio, new FailingInstallation());

    await expect(failing.importer.import(validArchive(2, [existingCard]))).rejects.toThrow(
      "database installation failed"
    );
    expect(audio.activeVersions).toEqual(new Set([`${TEST_DECK_ID}:1`]))
    expect(await database.getFirstAsync("SELECT version FROM decks WHERE id = ?", TEST_DECK_ID)).toEqual({ version: 1 });
  });

  it("completes active focused and mixed sessions when an installed deck changes", async () => {
    database = new NodeSqliteDatabase();
    const clock = new TestClock();
    const graph = createScenarioGraph(database, clock, new SequenceIdGenerator());
    const { importer } = createImporter(database, clock);
    const existingCard = card(testId(13), 0);
    await importer.import(validArchive(1, [existingCard]));
    const repository = new SQLiteFlashcardRepository(database.drizzle);
    const installedCard = await repository.findById(existingCard.id);
    if (!installedCard) {
      throw new Error("Missing installed card");
    }
    const focused = await graph.feed.prepareFeed([installedCard], "focused", TEST_DECK_ID, false, "ordered");
    const mixed = await graph.feed.prepareFeed([installedCard], "mixed", null, false, "shuffle");

    await importer.import(validArchive(2, [card(existingCard.id, 0, "Updated")]));
    expect((await graph.sessions.findById(focused.studySessionId))?.completedAt).not.toBeNull();
    expect((await graph.sessions.findById(mixed.studySessionId))?.completedAt).not.toBeNull();
  });

  it("completes the active mixed session when a new deck is installed", async () => {
    database = new NodeSqliteDatabase();
    const clock = new TestClock();
    const graph = createScenarioGraph(database, clock, new SequenceIdGenerator());
    const { importer } = createImporter(database, clock);
    const sourceCard = card(testId(14), 0);
    await importer.import(validArchive(1, [sourceCard]));
    const installedCard = await new SQLiteFlashcardRepository(database.drizzle).findById(sourceCard.id);
    if (!installedCard) {
      throw new Error("Missing installed card");
    }
    const mixed = await graph.feed.prepareFeed([installedCard], "mixed", null, false, "shuffle");

    await importer.import(validArchive(1, [card(testId(15), 0)], OTHER_DECK_ID));
    expect((await graph.sessions.findById(mixed.studySessionId))?.completedAt).not.toBeNull();
  });

  it.each([
    ["malformed deck", archive({ id: "not-a-uuid" })],
    ["duplicate IDs", archive(rawDeck(1, [card(testId(5), 0), card(testId(5), 1)]))],
    ["non-contiguous order", archive(rawDeck(1, [card(testId(6), 1)]))],
    ["unexpected audio filename", archive(deck(1, [card(testId(7), 0)]), { "audio/a.mp3": new Uint8Array([1]) })],
    ["unknown audio card", archive(deck(1, [card(testId(8), 0)]), { [`audio/${testId(9)}.answer.mp3`]: new Uint8Array([1]) })],
    ["unsafe archive path", archive(deck(1, [card(testId(10), 0)]), { "../escape.mp3": new Uint8Array([1]) })],
  ])("rejects %s before changing installed state", async (_name, bytes) => {
    database = new NodeSqliteDatabase();
    const clock = new TestClock();
    const { importer } = createImporter(database, clock);
    await importer.import(validArchive(1, [card(testId(11), 0)]));
    await expect(importer.import(bytes)).rejects.toThrow();
    expect(await database.getFirstAsync("SELECT version FROM decks WHERE id = ?", TEST_DECK_ID)).toEqual({ version: 1 });
  });
});
