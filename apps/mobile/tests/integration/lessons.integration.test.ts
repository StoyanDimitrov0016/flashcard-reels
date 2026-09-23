import { strToU8, zipSync } from "fflate";
import { afterEach, describe, expect, it } from "vitest";

import type {
  DeckAudioStorage,
  StagedDeckAudio,
} from "@/features/decks/deck-installer/internal/deck-package.model";
import type { DeckPackageDocument } from "@/features/decks/deck-installer/internal/deck-package.schema";

import { ArchiveDeckPackageReader } from "@/features/decks/deck-installer/internal/archive-deck-package.reader";
import { DeckInstallerImpl } from "@/features/decks/deck-installer/internal/deck-installer";
import { DECK_PACKAGE_LIMITS } from "@/features/decks/deck-installer/internal/deck-package-limits";
import { createDeckPackageArchive } from "@/features/decks/deck-installer/internal/deck-package-writer";
import { SQLiteDeckPackageInstallationTransaction } from "@/features/decks/deck-installer/internal/sqlite-deck-package-installation.transaction";
import { SQLiteDeckRemovalTransaction } from "@/features/decks/infrastructure/sqlite-deck-removal.transaction";
import { SQLiteDeckRepository } from "@/features/decks/infrastructure/sqlite-deck.repository";
import { LessonServiceImpl } from "@/features/lessons/application/lesson.service.impl";
import { SQLiteLessonRepository } from "@/features/lessons/infrastructure/sqlite-lesson.repository";
import { SQLiteReadingListQuery } from "@/features/lessons/infrastructure/sqlite-reading-list.query";
import { deckProgress } from "@/infrastructure/sqlite/schema";

import { NodeSqliteDatabase } from "../support/node-sqlite-database";
import { OTHER_DECK_ID, TEST_DECK_ID, TestClock, testId } from "../support/study-fixtures";

const timestamp = "2026-01-01T00:00:00.000Z";
const lessonIds = [testId(901), testId(902), testId(903)] as const;

class NoAudioStorage implements DeckAudioStorage {
  async stage(deckPackage: { id: string; version: number }): Promise<StagedDeckAudio> {
    return { deckId: deckPackage.id, token: "audio", version: deckPackage.version };
  }
  async activate(): Promise<void> {}
  async removeVersion(): Promise<void> {}
  async removeOtherVersions(): Promise<void> {}
}

type LessonInput = Readonly<{ id: string; title: string; order: number; markdown: string }>;

function packageWithLessons(
  version: number,
  lessonInputs: readonly LessonInput[],
  deckId = TEST_DECK_ID,
  title = "Scaling"
): Uint8Array {
  const document: DeckPackageDocument = {
    cards: [
      {
        answer: "Add resources to one machine.",
        createdAt: timestamp,
        id: deckId === TEST_DECK_ID ? testId(1) : testId(2),
        order: 0,
        question: "What is vertical scaling?",
        updatedAt: timestamp,
      },
    ],
    createdAt: timestamp,
    description: "Scaling basics",
    id: deckId,
    lessons: lessonInputs.map(({ id, order, title: lessonTitle }) => ({
      id,
      order,
      title: lessonTitle,
    })),
    title,
    updatedAt: timestamp,
    version,
  };
  return createDeckPackageArchive(
    document,
    {},
    Object.fromEntries(lessonInputs.map((lesson) => [lesson.id, lesson.markdown]))
  );
}

function createGraph(database: NodeSqliteDatabase) {
  return {
    installer: new DeckInstallerImpl(
      new ArchiveDeckPackageReader(),
      new SQLiteDeckPackageInstallationTransaction(database.drizzle),
      new NoAudioStorage(),
      new TestClock(),
      { read: async () => new Uint8Array() },
      new SQLiteDeckRepository(database.drizzle)
    ),
    lessons: new LessonServiceImpl(
      new SQLiteLessonRepository(database.drizzle),
      new SQLiteReadingListQuery(database.drizzle)
    ),
    removal: new SQLiteDeckRemovalTransaction(database.drizzle),
  };
}

const introduction = {
  id: lessonIds[0],
  markdown: "# Why scale\n\nLoad grows.",
  order: 0,
  title: "Why scale",
};
const vertical = {
  id: lessonIds[1],
  markdown: "Bigger machines.",
  order: 1,
  title: "Vertical scaling",
};
const horizontal = {
  id: lessonIds[2],
  markdown: "More machines.",
  order: 2,
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
        deckId: TEST_DECK_ID,
        deckTitle: "Scaling",
        lessons: [
          { id: introduction.id, order: 0, title: "Why scale" },
          { id: vertical.id, order: 1, title: "Vertical scaling" },
          { id: horizontal.id, order: 2, title: "Horizontal scaling" },
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
      packageWithLessons(2, [{ ...vertical, markdown: "Edited.", order: 0 }])
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
      deckId: TEST_DECK_ID,
      lastReviewedAt: timestamp,
      resolution: "pending",
      title: "Scaling",
      version: 1,
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

describe("deck package lesson validation", () => {
  const reader = new ArchiveDeckPackageReader();
  const deckJson = (lessons: readonly { id: string; order: number; title: string }[]) =>
    strToU8(
      JSON.stringify({
        cards: [],
        createdAt: timestamp,
        description: "",
        id: TEST_DECK_ID,
        lessons,
        title: "Scaling",
        updatedAt: timestamp,
        version: 1,
      })
    );
  const listed = [{ id: introduction.id, order: 0, title: "Why scale" }];

  it.each([
    [
      "an unlisted lesson file",
      { "deck.json": deckJson([]), [`lessons/${introduction.id}.md`]: strToU8("Text") },
      /unknown lesson/,
    ],
    ["a missing lesson file", { "deck.json": deckJson(listed) }, /Missing lesson file/],
    [
      "a lesson file with the wrong extension",
      { "deck.json": deckJson(listed), [`lessons/${introduction.id}.txt`]: strToU8("Text") },
      /Unexpected lesson filename/,
    ],
    [
      "an empty lesson",
      { "deck.json": deckJson(listed), [`lessons/${introduction.id}.md`]: strToU8("  \n") },
      /Empty lesson file/,
    ],
    [
      "an oversized lesson",
      {
        "deck.json": deckJson(listed),
        [`lessons/${introduction.id}.md`]: new Uint8Array(
          DECK_PACKAGE_LIMITS.maximumLessonFileBytes + 1
        ).fill(65),
      },
      /Lesson file size .* exceeds limit/,
    ],
  ])("rejects %s", (_name, files, message) => {
    expect(() => reader.read(zipSync(files))).toThrow(message);
  });

  it("rejects duplicate lesson IDs and gaps in lesson order", () => {
    const duplicated = [
      { id: introduction.id, order: 0, title: "One" },
      { id: introduction.id, order: 2, title: "Two" },
    ];
    const files = {
      "deck.json": deckJson(duplicated),
      [`lessons/${introduction.id}.md`]: strToU8("Text"),
    };

    expect(() => reader.read(zipSync(files))).toThrow(/Duplicate lesson ID[\s\S]*contiguous/);
  });
});
