import { parseDeckPackage } from "@flashcard-reels/deck-contract";
import { parseLessonDocument } from "@flashcard-reels/deck-contract";
import { strToU8, unzipSync, zipSync } from "fflate";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import type {
  DeckAudioStorage,
  DeckPackage,
  StagedDeckAudio,
} from "@/features/decks/deck-installer/internal/deck-package.model";

import { createContractDeckPackageArchive } from "@/features/decks/deck-installer/internal/contract-deck-package-writer";
import { DeckInstallerImpl } from "@/features/decks/deck-installer/internal/deck-installer";
import { SQLiteDeckPackageInstallationTransaction } from "@/features/decks/deck-installer/internal/sqlite-deck-package-installation.transaction";
import { SQLiteDeckRepository } from "@/features/decks/infrastructure/sqlite-deck.repository";
import { SQLiteFlashcardRepository } from "@/features/flashcards/infrastructure/sqlite-flashcard.repository";
import { SQLiteLessonRepository } from "@/features/lessons/infrastructure/sqlite-lesson.repository";
import { flashcardProgress } from "@/infrastructure/sqlite/schema";

import { NodeSqliteDatabase } from "../support/node-sqlite-database";
import { SequenceIdGenerator, TestClock } from "../support/study-fixtures";

const demoId = "7f6f98a7-a84d-4cc8-b744-3d0b53e3c873";

class ResolvingAudioStorage implements DeckAudioStorage {
  private staged: DeckPackage | null = null;
  private readonly files = new Set<string>();

  async stage(deckPackage: DeckPackage): Promise<StagedDeckAudio> {
    this.staged = deckPackage;
    return { deckId: deckPackage.deck.id, token: "demo", revision: deckPackage.deck.revision };
  }

  async activate(staged: StagedDeckAudio): Promise<void> {
    if (!this.staged) {
      throw new Error("Missing staged demo");
    }
    for (const cardId of this.staged.audioFiles.keys()) {
      this.files.add([staged.deckId, staged.revision, `${cardId}.mp3`].join("/"));
    }
  }

  async removeRevision(): Promise<void> {}
  async removeOtherRevisions(): Promise<void> {}

  find(deckId: string, version: number, cardId: string): string | null {
    const installedPath = [deckId, version, cardId + ".mp3"].join("/");
    return this.files.has(installedPath) ? installedPath : null;
  }
}

describe("built-in demo package", () => {
  let database: NodeSqliteDatabase | null = null;
  afterEach(() => database?.close());

  it("installs into a fresh database through the normal installer and resolves installed audio", async () => {
    database = new NodeSqliteDatabase();
    const bytes = new Uint8Array(
      await readFile(path.join(process.cwd(), "assets", "decks", demoId + ".fcrdeck"))
    );

    const parsed = parseDeckPackage(bytes);
    const audio = new ResolvingAudioStorage();
    const installer = new DeckInstallerImpl(
      new SQLiteDeckPackageInstallationTransaction(database.drizzle, new SequenceIdGenerator()),
      audio,
      new TestClock(),
      { read: async () => bytes },
      new SQLiteDeckRepository(database.drizzle)
    );

    expect(parsed.deck.cards).toHaveLength(20);
    expect(parsed.audioFiles.size).toBe(6);
    expect(parsed.lessonFiles.size).toBe(5);
    await expect(installer.installFromFile({ uri: "bundled-demo" })).resolves.toMatchObject({
      deckId: demoId,
      status: "installed",
      revision: 3,
    });
    expect(await new SQLiteDeckRepository(database.drizzle).findRevision(demoId)).toBe(3);
    const audioCard = parsed.deck.cards[0];
    if (!audioCard) {
      throw new Error("Demo package has no cards");
    }
    expect(audio.find(demoId, 3, audioCard.id)).not.toBeNull();

    // Query freshly constructed repositories, rather than relying on the parsed package in memory.
    const flashcards = new SQLiteFlashcardRepository(database.drizzle);
    const lessons = new SQLiteLessonRepository(database.drizzle);
    await Promise.all(
      parsed.deck.cards.map(async (card) => {
        const installedCard = await flashcards.findById(card.id);
        expect(installedCard?.lessonSectionId).toBe(card.lessonSectionId ?? null);
        if (installedCard?.lessonId && installedCard.lessonSectionId) {
          const lesson = await lessons.findById(installedCard.lessonId);
          if (!lesson) {
            throw new Error("Referenced demo lesson was not installed");
          }
          expect(
            parseLessonDocument(lesson.content, lesson.title).sections.map((section) => section.id)
          ).toContain(installedCard.lessonSectionId);
        }
      })
    );

    const linked = parsed.deck.cards.find((card) => card.question === "What is vertical scaling?");
    if (!linked) {
      throw new Error("Missing linked scaling card");
    }
    const timestamp = "2026-10-01T00:00:00Z";
    await database.drizzle.insert(flashcardProgress).values({
      id: database.rowIds.generate(),
      flashcardId: linked.id,
      deckId: demoId,
      reviewCount: 1,
      goodCount: 1,
      firstReviewedAt: timestamp,
      lastReviewedAt: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    const updatedDeck = {
      ...parsed.deck,
      revision: 4,
    };
    await installer.installFromBytes(
      createContractDeckPackageArchive(
        updatedDeck,
        Object.fromEntries(parsed.audioFiles),
        Object.fromEntries(
          [...parsed.lessonFiles].map(([id, content]) => [
            id,
            content.replace("## Vertical scaling", "## Scaling one machine"),
          ])
        )
      )
    );
    expect(await new SQLiteFlashcardRepository(database.drizzle).findById(linked.id)).toMatchObject(
      {
        lessonSectionId: linked.lessonSectionId,
      }
    );
    if (!linked.lessonId) {
      throw new Error("Missing linked lesson");
    }
    const reloaded = await new SQLiteLessonRepository(database.drizzle).findById(linked.lessonId);
    if (!reloaded) {
      throw new Error("Missing installed lesson");
    }
    expect(
      parseLessonDocument(reloaded.content, reloaded.title).sections.find(
        (section) => section.id === linked.lessonSectionId
      )?.title
    ).toBe("Scaling one machine");
    expect(await database.drizzle.select().from(flashcardProgress)).toMatchObject([
      { flashcardId: linked.id, reviewCount: 1, goodCount: 1 },
    ]);

    const files = unzipSync(bytes);
    files["deck.json"] = strToU8(
      JSON.stringify({
        ...updatedDeck,
        revision: 5,
        cards: updatedDeck.cards.map((card) =>
          card.id === linked.id
            ? Object.assign({}, card, { lessonSectionId: "missing-section" })
            : card
        ),
      })
    );
    await expect(installer.installFromBytes(zipSync(files))).rejects.toThrow("missing section");
    expect(await new SQLiteDeckRepository(database.drizzle).findRevision(demoId)).toBe(4);
    expect(await new SQLiteFlashcardRepository(database.drizzle).findById(linked.id)).toMatchObject(
      {
        lessonSectionId: linked.lessonSectionId,
      }
    );
  });
});
