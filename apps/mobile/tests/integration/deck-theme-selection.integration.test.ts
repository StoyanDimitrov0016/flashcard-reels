import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { DeckServiceImpl } from "@/features/decks/application/deck.service.impl";
import { SQLiteDeckPackageInstallationTransaction } from "@/features/decks/deck-installer/internal/sqlite-deck-package-installation.transaction";
import { DeckThemeSelection } from "@/features/decks/domain/deck-theme-selection.model";
import { SQLiteDeckRemovalTransaction } from "@/features/decks/infrastructure/sqlite-deck-removal.transaction";
import { SQLiteDeckThemeSelectionRepository } from "@/features/decks/infrastructure/sqlite-deck-theme-selection.repository";
import { SQLiteDeckRepository } from "@/features/decks/infrastructure/sqlite-deck.repository";
import { SQLiteSavedProgressDeletionTransaction } from "@/features/decks/infrastructure/sqlite-saved-progress-deletion.transaction";
import { deckThemeSelections, decks } from "@/infrastructure/sqlite/schema";

import { NodeSqliteDatabase } from "../support/node-sqlite-database";
import { createScenarioGraph, seedDeck } from "../support/sqlite-study-scenario";
import { SequenceIdGenerator, TEST_DECK_ID, testId, TestClock } from "../support/study-fixtures";

describe("deck theme selection persistence", () => {
  let database: NodeSqliteDatabase;

  beforeEach(async () => {
    database = new NodeSqliteDatabase();
    await database.drizzle.insert(decks).values({
      authorId: "00000000-0000-4000-8000-000000000001",
      packageSchema: 1,
      revision: 1,

      createdAt: "2026-01-01T00:00:00.000Z",
      description: "Untouched content",
      id: TEST_DECK_ID,
      title: "Test deck",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
  });

  afterEach(() => database.close());

  it("stores and reloads a deck theme without changing deck content", async () => {
    const ids = new SequenceIdGenerator();
    const service = new DeckServiceImpl(
      new SQLiteDeckRepository(database.drizzle),
      new SQLiteDeckThemeSelectionRepository(database.drizzle, ids),
      new SQLiteDeckRemovalTransaction(database.drizzle, database.rowIds)
    );
    const selection = new DeckThemeSelection({
      deckId: TEST_DECK_ID,
      theme: "cyan",
    });

    await service.saveThemeSelection(selection);

    expect(await service.getThemeSelection(TEST_DECK_ID)).toEqual(selection);
    const stored = await database.drizzle.select().from(deckThemeSelections);
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({ deckId: TEST_DECK_ID, theme: "cyan" });
    expect(stored[0]?.id).toBe(testId(1000));
    const originalSelectionId = stored[0]?.id;
    const updatedSelection = new DeckThemeSelection({ deckId: TEST_DECK_ID, theme: "rose" });
    await service.saveThemeSelection(updatedSelection);
    expect(await service.getThemeSelection(TEST_DECK_ID)).toEqual(updatedSelection);
    expect(await database.drizzle.select().from(deckThemeSelections)).toEqual([
      { id: originalSelectionId, deckId: TEST_DECK_ID, theme: "rose" },
    ]);
    const storedDeck = await service.findById(TEST_DECK_ID);
    expect(storedDeck?.description).toBe("Untouched content");
    expect(storedDeck?.coverAsset).toBe("cards");

    await database.runAsync("UPDATE deck_theme_selections SET theme = ?", "missing-theme");
    expect(await service.getThemeSelection(TEST_DECK_ID)).toEqual(
      new DeckThemeSelection({ deckId: TEST_DECK_ID, theme: "graphite" })
    );
  });

  it("retains the selection across removal and reinstall, then deletes it for Start fresh", async () => {
    const repository = new SQLiteDeckThemeSelectionRepository(
      database.drizzle,
      new SequenceIdGenerator()
    );
    await repository.save(new DeckThemeSelection({ deckId: TEST_DECK_ID, theme: "gold" }));

    await new SQLiteDeckRemovalTransaction(database.drizzle, database.rowIds).remove(TEST_DECK_ID);

    const removedSelection = await repository.findByDeckId(TEST_DECK_ID);
    expect(removedSelection?.theme).toBe("gold");
    await new SQLiteDeckPackageInstallationTransaction(database.drizzle, database.rowIds).install(
      {
        deck: {
          schema: 1,
          id: TEST_DECK_ID,
          authorId: testId(500),
          title: "Reinstalled",
          description: "",
          revision: 1,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
          cards: [],
          lessons: [],
        },
        audioFiles: new Map(),
        lessonFiles: new Map(),
      },
      "2026-01-01T00:00:00.000Z"
    );
    const reinstalledSelection = await repository.findByDeckId(TEST_DECK_ID);
    expect(reinstalledSelection?.theme).toBe("gold");
    await new SQLiteSavedProgressDeletionTransaction(database.drizzle).deleteProgress(TEST_DECK_ID);
    expect(await repository.findByDeckId(TEST_DECK_ID)).toBeNull();
  });
  it.each(["card", "deck", "all"] as const)(
    "keeps themes when resetting %s learning progress",
    async (scope) => {
      const cardId = testId(900);
      await seedDeck(database, testId(800), [cardId]);
      const repository = new SQLiteDeckThemeSelectionRepository(database.drizzle, database.rowIds);
      await repository.save(new DeckThemeSelection({ deckId: testId(800), theme: "cyan" }));
      const graph = createScenarioGraph(database, new TestClock(), new SequenceIdGenerator());
      if (scope === "card") {
        await graph.flashcardProgress.resetFlashcardProgress(cardId);
      } else if (scope === "deck") {
        await graph.flashcardProgress.resetDeckProgress(testId(800));
      } else {
        await graph.flashcardProgress.resetAllProgress();
      }
      const selection = await repository.findByDeckId(testId(800));
      expect(selection?.theme).toBe("cyan");
    }
  );
});
