import { strToU8, zipSync } from "fflate";
import { afterEach, describe, expect, it } from "vitest";

import { DeckPackageImportService } from "@/features/decks/application/deck-package-import.service";
import { ArchiveDeckPackageReader } from "@/features/decks/infrastructure/archive-deck-package.reader";
import { SQLiteDeckPackageInstallationTransaction } from "@/features/decks/infrastructure/sqlite-deck-package-installation.transaction";
import type {
  DeckAudioStorage,
  DeckPackage,
  PreparedDeckAudio,
} from "@/features/decks/domain/deck-package.model";
import type {
  DeckPackageCard,
  DeckPackageManifest,
} from "@/features/decks/contracts/deck-package.schema";
import { SQLiteFlashcardRepository } from "@/features/flashcards/infrastructure/sqlite-flashcard.repository";
import { NodeSqliteDatabase } from "./support/node-sqlite-database";
import { createScenarioGraph, type ScenarioGraph } from "./support/sqlite-study-scenario";
import { SequenceIdGenerator, TEST_DECK_ID, TestClock, testId } from "./support/study-test-support";

const timestamp = "2026-01-01T00:00:00.000Z";

class MemoryAudioStorage implements DeckAudioStorage {
  readonly promoted = new Set<string>();
  readonly discarded = new Set<string>();
  private nextToken = 0;

  async prepare(deckPackage: DeckPackage): Promise<PreparedDeckAudio> {
    this.nextToken += 1;
    return {
      deckId: deckPackage.manifest.id,
      token: `audio-${this.nextToken}`,
      version: deckPackage.manifest.version,
    };
  }

  async promote(prepared: PreparedDeckAudio): Promise<void> {
    this.promoted.add(prepared.token);
  }

  async discard(prepared: PreparedDeckAudio): Promise<void> {
    this.discarded.add(prepared.token);
  }
}

function manifest(version: number): DeckPackageManifest {
  return {
    createdAt: timestamp,
    description: "Scenario deck",
    id: TEST_DECK_ID,
    title: "Scenario deck",
    updatedAt: new Date(Date.parse(timestamp) + version * 60_000).toISOString(),
    version,
  };
}

function card(id: string, order: number, answer = `Answer ${id}`): DeckPackageCard {
  return {
    answer,
    answerAudio: `audio/${id}.mp3`,
    createdAt: timestamp,
    deckId: TEST_DECK_ID,
    id,
    order,
    question: `Question ${id}`,
    updatedAt: timestamp,
  };
}

function archive(
  packageManifest: DeckPackageManifest,
  cards: readonly Record<string, unknown>[],
  audio: Readonly<Record<string, Uint8Array>> = {}
): Uint8Array {
  const files: Record<string, Uint8Array> = {
    "manifest.json": strToU8(JSON.stringify(packageManifest)),
    "cards.json": strToU8(JSON.stringify(cards)),
    ...audio,
  };
  return zipSync(files);
}

function validArchive(packageManifest: DeckPackageManifest, cards: readonly DeckPackageCard[]) {
  const audio: Record<string, Uint8Array> = {};
  for (const candidate of cards) {
    if (candidate.answerAudio) {
      audio[candidate.answerAudio] = new Uint8Array([1, 2, 3]);
    }
  }
  return archive(packageManifest, cards, audio);
}

function createImporter(
  database: NodeSqliteDatabase,
  clock: TestClock,
  audio = new MemoryAudioStorage()
) {
  return {
    audio,
    importer: new DeckPackageImportService(
      new ArchiveDeckPackageReader(),
      new SQLiteDeckPackageInstallationTransaction(database.drizzle),
      audio,
      clock,
      { read: async () => new Uint8Array() }
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

describe("external deck package installation", () => {
  let database: NodeSqliteDatabase | null = null;

  afterEach(() => database?.close());

  it("installs cards and audio, then applies updates without losing learner history", async () => {
    database = new NodeSqliteDatabase();
    const clock = new TestClock();
    const graph = createScenarioGraph(database, clock, new SequenceIdGenerator());
    const { audio, importer } = createImporter(database, clock);
    const cardA = card(testId(1), 0);
    const cardB = card(testId(2), 1);

    expect((await importer.import(validArchive(manifest(1), [cardA, cardB]))).status).toBe(
      "installed"
    );
    expect(
      (await new SQLiteFlashcardRepository(database.drizzle).listByDeckId(TEST_DECK_ID)).map(
        (x) => x.id
      )
    ).toEqual([cardA.id, cardB.id]);
    expect(audio.promoted).toHaveLength(1);

    const sessionId = await reviewCard(graph, database, cardA.id, false);
    const updatedA = card(cardA.id, 1, "Changed answer");
    const cardC = card(testId(3), 0);
    expect((await importer.import(validArchive(manifest(2), [updatedA, cardC]))).status).toBe(
      "updated"
    );
    expect((await graph.sessions.findById(sessionId))?.completedAt).not.toBeNull();
    await graph.study.recoverPendingCompletedSessionAggregation();

    const repository = new SQLiteFlashcardRepository(database.drizzle);
    expect(await repository.listByDeckId(TEST_DECK_ID)).toMatchObject([
      { id: cardC.id, active: true, order: 0 },
      { id: cardA.id, active: true, answer: "Changed answer", order: 1 },
    ]);
    expect(await repository.findById(cardB.id)).toMatchObject({ active: false });
    expect(
      await database.getFirstAsync(
        "SELECT review_count FROM learner_profiles WHERE flashcard_id = ?",
        cardA.id
      )
    ).toEqual({ review_count: 1 });
    expect(
      await database.getFirstAsync(
        "SELECT COUNT(*) AS count FROM flashcard_review_attempts WHERE flashcard_id = ?",
        cardA.id
      )
    ).toEqual({
      count: 1,
    });
    expect(
      await database.getFirstAsync(
        "SELECT review_count FROM learner_profiles WHERE flashcard_id = ?",
        cardC.id
      )
    ).toEqual({
      review_count: 0,
    });
  });

  it("reactivates a removed card and preserves its state, while same and lower versions are safe", async () => {
    database = new NodeSqliteDatabase();
    const clock = new TestClock();
    const graph = createScenarioGraph(database, clock, new SequenceIdGenerator());
    const { audio, importer } = createImporter(database, clock);
    const cardD = card(testId(4), 0);

    await importer.import(validArchive(manifest(1), [cardD]));
    await reviewCard(graph, database, cardD.id);
    await importer.import(validArchive(manifest(2), []));
    expect(
      await new SQLiteFlashcardRepository(database.drizzle).listByDeckId(TEST_DECK_ID)
    ).toEqual([]);
    expect(
      await database.getFirstAsync("SELECT active FROM flashcards WHERE id = ?", cardD.id)
    ).toEqual({ active: 0 });

    const sameVersion = await importer.import(validArchive(manifest(2), [cardD]));
    expect(sameVersion.status).toBe("no-op");
    expect(audio.discarded).toHaveLength(1);
    await expect(importer.import(validArchive(manifest(1), [cardD]))).rejects.toThrow("older");
    expect(
      await database.getFirstAsync("SELECT version FROM decks WHERE id = ?", TEST_DECK_ID)
    ).toEqual({ version: 2 });

    await importer.import(validArchive(manifest(3), [cardD]));
    expect(await new SQLiteFlashcardRepository(database.drizzle).findById(cardD.id)).toMatchObject({
      active: true,
    });
    expect(
      await database.getFirstAsync(
        "SELECT review_count FROM learner_profiles WHERE flashcard_id = ?",
        cardD.id
      )
    ).toEqual({
      review_count: 1,
    });
  });

  it.each([
    [
      "malformed manifest",
      archive(manifest(1), [card(testId(5), 0)], { "audio/a.mp3": new Uint8Array([1]) }),
    ],
    ["malformed cards", archive(manifest(1), [{ id: "not-a-uuid" }], {})],
    ["duplicate IDs", validArchive(manifest(1), [card(testId(6), 0), card(testId(6), 1)])],
    ["missing audio", archive(manifest(1), [card(testId(7), 0)], {})],
    [
      "unsafe archive path",
      archive(manifest(1), [card(testId(8), 0)], { "../escape.mp3": new Uint8Array([1]) }),
    ],
  ])("rejects %s before changing installed state", async (_name, bytes) => {
    database = new NodeSqliteDatabase();
    const clock = new TestClock();
    const { importer } = createImporter(database, clock);
    const validCard = card(testId(9), 0);
    await importer.import(validArchive(manifest(1), [validCard]));

    await expect(importer.import(bytes)).rejects.toThrow();
    expect(
      await database.getFirstAsync("SELECT version, title FROM decks WHERE id = ?", TEST_DECK_ID)
    ).toEqual({
      title: "Scenario deck",
      version: 1,
    });
    expect(
      await database.getFirstAsync("SELECT COUNT(*) AS count FROM flashcards WHERE active = 1")
    ).toEqual({ count: 1 });
  });
});
