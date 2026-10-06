import type { Deck } from "@flashcard-reels/deck-contract";

import { afterEach, describe, expect, it } from "vitest";

import type {
  DeckAudioStorage,
  DeckPackage,
  StagedDeckAudio,
} from "@/features/decks/deck-installer/internal/deck-package.model";

import { createContractDeckPackageArchive } from "@/features/decks/deck-installer/internal/contract-deck-package-writer";
import { ContractDeckPackageReader } from "@/features/decks/deck-installer/internal/contract-deck-package.reader";
import { DeckInstallerImpl } from "@/features/decks/deck-installer/internal/deck-installer";
import { SQLiteDeckPackageInstallationTransaction } from "@/features/decks/deck-installer/internal/sqlite-deck-package-installation.transaction";
import { SQLiteDeckRemovalTransaction } from "@/features/decks/infrastructure/sqlite-deck-removal.transaction";
import { SQLiteDeckRepository } from "@/features/decks/infrastructure/sqlite-deck.repository";
import { LessonServiceImpl } from "@/features/lessons/application/lesson.service.impl";
import { SQLiteLessonRepository } from "@/features/lessons/infrastructure/sqlite-lesson.repository";
import { SQLiteReadingListQuery } from "@/features/lessons/infrastructure/sqlite-reading-list.query";
import { deckProgress } from "@/infrastructure/sqlite/schema";

import { NodeSqliteDatabase } from "../support/node-sqlite-database";
import {
  OTHER_DECK_ID,
  SequenceIdGenerator,
  TEST_DECK_ID,
  TestClock,
  testId,
} from "../support/study-fixtures";

const timestamp = "2026-01-01T00:00:00.000Z";
const lessonIds = [testId(901), testId(902), testId(903)] as const;

class NoAudioStorage implements DeckAudioStorage {
  async stage(deckPackage: DeckPackage): Promise<StagedDeckAudio> {
    return { deckId: deckPackage.deck.id, token: "audio", revision: deckPackage.deck.revision };
  }
  async activate(): Promise<void> {}
  async removeRevision(): Promise<void> {}
  async removeOtherRevisions(): Promise<void> {}
}

type LessonInput = Readonly<{ id: string; title: string; markdown: string }>;

function packageWithLessons(
  version: number,
  lessonInputs: readonly LessonInput[],
  deckId = TEST_DECK_ID,
  title = "Scaling"
): Uint8Array {
  const document: Deck = {
    cards: [
      {
        answer: "Add resources to one machine.",
        createdAt: timestamp,
        id: deckId === TEST_DECK_ID ? testId(1) : testId(2),
        lessonId: null,
        audio: false,
        question: "What is vertical scaling?",
        updatedAt: timestamp,
      },
    ],
    createdAt: timestamp,
    authorId: "bf0b5aa7-18d6-4b36-aae9-5aa93f93235e",
    schema: 1,
    description: "Scaling basics",
    id: deckId,
    lessons: lessonInputs.map(({ id, title: lessonTitle }) => ({
      id,
      title: lessonTitle,
    })),
    title,
    updatedAt: timestamp,
    revision: version,
  };
  return createContractDeckPackageArchive(
    document,
    {},
    Object.fromEntries(lessonInputs.map((lesson) => [lesson.id, lesson.markdown]))
  );
}

function createGraph(database: NodeSqliteDatabase) {
  return {
    installer: new DeckInstallerImpl(
      new ContractDeckPackageReader(),
      new SQLiteDeckPackageInstallationTransaction(database.drizzle, new SequenceIdGenerator()),
      new NoAudioStorage(),
      new TestClock(),
      { read: async () => new Uint8Array() },
      new SQLiteDeckRepository(database.drizzle)
    ),
    lessons: new LessonServiceImpl(
      new SQLiteLessonRepository(database.drizzle),
      new SQLiteReadingListQuery(database.drizzle)
    ),
    removal: new SQLiteDeckRemovalTransaction(database.drizzle, database.rowIds),
  };
}

const introduction = {
  id: lessonIds[0],
  markdown: "# Why scale\n\nLoad grows.",
  title: "Why scale",
};
const vertical = {
  id: lessonIds[1],
  markdown: "Bigger machines.",
  title: "Vertical scaling",
};
const horizontal = {
  id: lessonIds[2],
  markdown: "More machines.",
  title: "Horizontal scaling",
};

describe("deck lessons", () => {
  let database: NodeSqliteDatabase | null = null;

  afterEach(() => database?.close());

  it("installs lessons with their deck and lists them in reading order", async () => {
    database = new NodeSqliteDatabase();
    const graph = createGraph(database);

    await graph.installer.installFromBytes(
      packageWithLessons(1, [horizontal, introduction, vertical])
    );

    expect(await graph.lessons.listReadingLists()).toEqual([
      {
        deckCoverAsset: "cards",
        deckId: TEST_DECK_ID,
        deckTitle: "Scaling",
        lessons: [
          { id: horizontal.id, order: 0, title: "Horizontal scaling" },
          { id: introduction.id, order: 1, title: "Why scale" },
          { id: vertical.id, order: 2, title: "Vertical scaling" },
        ],
      },
    ]);
    expect(await graph.lessons.findById(introduction.id)).toMatchObject({
      content: "# Why scale\n\nLoad grows.",
      deckId: TEST_DECK_ID,
    });
  });

  it("replaces lessons when a new deck version edits or removes them", async () => {
    database = new NodeSqliteDatabase();
    const graph = createGraph(database);
    await graph.installer.installFromBytes(packageWithLessons(1, [introduction, vertical]));

    await graph.installer.installFromBytes(
      packageWithLessons(2, [{ ...vertical, markdown: "Edited." }])
    );

    const [readingList] = await graph.lessons.listReadingLists();
    expect(readingList?.lessons).toEqual([
      { id: vertical.id, order: 0, title: "Vertical scaling" },
    ]);
    const editedLesson = await graph.lessons.findById(vertical.id);
    expect(editedLesson?.content).toBe("Edited.");
    expect(await graph.lessons.findById(introduction.id)).toBeNull();
  });

  it("removes lessons with their deck and omits decks without lessons", async () => {
    database = new NodeSqliteDatabase();
    const graph = createGraph(database);
    await graph.installer.installFromBytes(packageWithLessons(1, [introduction]));
    await graph.installer.installFromBytes(packageWithLessons(1, [], OTHER_DECK_ID, "No lessons"));

    const readingLists = await graph.lessons.listReadingLists();
    expect(readingLists.map((list) => list.deckId)).toEqual([TEST_DECK_ID]);

    await graph.removal.remove(TEST_DECK_ID);

    expect(await graph.lessons.listReadingLists()).toEqual([]);
    expect(await graph.lessons.findById(introduction.id)).toBeNull();
  });

  it("keeps lessons readable while a reinstalled deck waits for the saved-progress choice", async () => {
    database = new NodeSqliteDatabase();
    const graph = createGraph(database);
    await graph.installer.installFromBytes(packageWithLessons(1, [introduction]));
    await database.drizzle.insert(deckProgress).values({
      id: database.rowIds.generate(),

      deckId: TEST_DECK_ID,
      lastReviewedAt: timestamp,
      status: "pending",
      title: "Scaling",
      revision: 1,
    });

    expect(await graph.lessons.listReadingLists()).toHaveLength(1);
  });

  it("rejects a lesson ID that already belongs to another deck without changing either deck", async () => {
    database = new NodeSqliteDatabase();
    const graph = createGraph(database);
    await graph.installer.installFromBytes(packageWithLessons(1, [introduction]));

    await expect(
      graph.installer.installFromBytes(packageWithLessons(1, [introduction], OTHER_DECK_ID, "Copy"))
    ).rejects.toThrow(`Lesson ${introduction.id} already belongs to deck ${TEST_DECK_ID}`);
    expect(await graph.lessons.listReadingLists()).toHaveLength(1);
  });
});
