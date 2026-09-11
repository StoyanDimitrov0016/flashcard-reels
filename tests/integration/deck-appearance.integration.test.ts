import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { DeckServiceImpl } from "@/features/decks/application/deck.service.impl";
import { DeckAppearance } from "@/features/decks/domain/deck-appearance.model";
import { SQLiteDeckAppearanceRepository } from "@/features/decks/infrastructure/sqlite-deck-appearance.repository";
import { SQLiteDeckRepository } from "@/features/decks/infrastructure/sqlite-deck.repository";
import { decks } from "@/infrastructure/sqlite/schema";
import { NodeSqliteDatabase } from "../support/node-sqlite-database";
import { TEST_DECK_ID } from "../support/study-test-support";

describe("deck appearance persistence", () => {
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

  it("updates and reloads appearance without changing deck content", async () => {
    const service = new DeckServiceImpl(
      new SQLiteDeckRepository(database.drizzle),
      new SQLiteDeckAppearanceRepository(database.drizzle)
    );
    const appearance = new DeckAppearance({
      deckId: TEST_DECK_ID,
      presetId: "cyan",
    });

    await service.saveAppearance(appearance);

    expect(await service.getAppearance(TEST_DECK_ID)).toEqual(appearance);
    const storedDeck = await service.findById(TEST_DECK_ID);
    expect(storedDeck?.description).toBe("Untouched content");
    expect(storedDeck?.coverAsset).toBe("cards");
  });
});
