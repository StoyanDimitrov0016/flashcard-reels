import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { DeckServiceImpl } from "@/features/decks/application/deck.service.impl";
import { DeckThemeSelection } from "@/features/decks/domain/deck-theme-selection.model";
import { SQLiteDeckRemovalTransaction } from "@/features/decks/infrastructure/sqlite-deck-removal.transaction";
import { SQLiteDeckThemeSelectionRepository } from "@/features/decks/infrastructure/sqlite-deck-theme-selection.repository";
import { SQLiteDeckRepository } from "@/features/decks/infrastructure/sqlite-deck.repository";
import { deckThemeSelections, decks } from "@/infrastructure/sqlite/schema";

import { NodeSqliteDatabase } from "../support/node-sqlite-database";
import { SequenceIdGenerator, TEST_DECK_ID, testId } from "../support/study-fixtures";

describe("deck theme selection persistence", () => {
  let database: NodeSqliteDatabase;

  beforeEach(async () => {
    database = new NodeSqliteDatabase();
    await database.drizzle.insert(decks).values({
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
      new SQLiteDeckRemovalTransaction(database.drizzle)
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
    await expect(service.getThemeSelection(TEST_DECK_ID)).rejects.toThrow(
      "Unknown deck theme missing-theme"
    );
  });

  it("removes the selection when its deck is removed", async () => {
    const repository = new SQLiteDeckThemeSelectionRepository(
      database.drizzle,
      new SequenceIdGenerator()
    );
    await repository.save(new DeckThemeSelection({ deckId: TEST_DECK_ID, theme: "gold" }));

    await new SQLiteDeckRemovalTransaction(database.drizzle).remove(TEST_DECK_ID);

    expect(await repository.findByDeckId(TEST_DECK_ID)).toBeNull();
    expect(await database.drizzle.select().from(deckThemeSelections)).toEqual([]);
  });
});
