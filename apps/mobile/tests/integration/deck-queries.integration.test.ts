import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { DeckServiceImpl } from "@/features/decks/application/deck.service.impl";
import { DeckThemeSelection } from "@/features/decks/domain/deck-theme-selection.model";
import { SQLiteDeckRemovalTransaction } from "@/features/decks/infrastructure/sqlite-deck-removal.transaction";
import { SQLiteDeckThemeSelectionRepository } from "@/features/decks/infrastructure/sqlite-deck-theme-selection.repository";
import { SQLiteDeckRepository } from "@/features/decks/infrastructure/sqlite-deck.repository";
import { SQLiteFlashcardAvailabilityQuery } from "@/features/flashcards/infrastructure/sqlite-flashcard-availability.query";
import { SQLiteFlashcardRepository } from "@/features/flashcards/infrastructure/sqlite-flashcard.repository";

import { NodeSqliteDatabase } from "../support/node-sqlite-database";
import { createScenarioGraph, seedDeck } from "../support/sqlite-study-scenario";
import { SequenceIdGenerator, TestClock, TEST_DECK_ID, testId } from "../support/study-fixtures";

describe("deck screen queries through SQLite", () => {
  let database: NodeSqliteDatabase;
  let service: DeckServiceImpl;
  beforeEach(async () => {
    database = new NodeSqliteDatabase();
    await seedDeck(database, TEST_DECK_ID, [testId(1), testId(2)]);
    const themes = new SQLiteDeckThemeSelectionRepository(database.drizzle, database.rowIds);
    await themes.save(new DeckThemeSelection({ deckId: TEST_DECK_ID, theme: "cyan" }));
    service = new DeckServiceImpl(
      new SQLiteDeckRepository(database.drizzle),
      themes,
      new SQLiteDeckRemovalTransaction(database.drizzle, database.rowIds),
      null,
      createScenarioGraph(database, new TestClock(), new SequenceIdGenerator()).runtime,
      new SQLiteFlashcardRepository(database.drizzle),
      new SQLiteFlashcardAvailabilityQuery(database.drizzle)
    );
  });
  afterEach(() => database.close());
  it("keeps inactive cards out of details and catalog counts", async () => {
    await database.runAsync("UPDATE flashcards SET active = 0 WHERE id = ?", testId(2));
    const details = await service.getDetails(TEST_DECK_ID);
    expect(details.cards.map((card) => card.id)).toEqual([testId(1)]);
    expect(details.themeSelection?.theme).toBe("cyan");
    expect(await service.getCatalog()).toMatchObject([
      { deck: { id: TEST_DECK_ID }, themeSelection: { theme: "cyan" }, cardCount: 1 },
    ]);
  });
  it("retains a removed deck's theme while details report the deck missing", async () => {
    await service.remove(TEST_DECK_ID);
    expect(await service.getDetails(TEST_DECK_ID)).toEqual({
      deck: null,
      cards: [],
      themeSelection: null,
    });
    expect(await service.findWithThemes([TEST_DECK_ID])).toMatchObject([
      { deckId: TEST_DECK_ID, deck: null, themeSelection: { theme: "cyan" } },
    ]);
    expect(await service.getCatalog()).toEqual([]);
  });
  it("keeps pending progress out of studyable details while the catalog still counts installed cards", async () => {
    await database.runAsync(
      "INSERT INTO deck_progress (id, deck_id, title, revision, last_reviewed_at, status) VALUES (?, ?, ?, ?, ?, ?)",
      testId(900),
      TEST_DECK_ID,
      "Pending",
      1,
      "2026-01-01T00:00:00.000Z",
      "pending"
    );
    const details = await service.getDetails(TEST_DECK_ID);
    expect(details.cards).toEqual([]);
    expect(await service.getCatalog()).toMatchObject([{ cardCount: 2 }]);
  });
  it("rejects a catalog with missing appearance rather than silently dropping a deck", async () => {
    await database.runAsync("DELETE FROM deck_theme_selections");
    await expect(service.getCatalog()).rejects.toMatchObject({
      code: "VIEW_LOAD_FAILED",
      context: { deckId: TEST_DECK_ID },
    });
  });
});
