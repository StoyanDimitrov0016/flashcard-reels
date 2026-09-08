import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { DeckServiceImpl } from "@/features/decks/application/deck.service.impl";
import { DeckAppearance } from "@/features/decks/domain/deck-appearance.model";
import { SQLiteDeckAppearanceRepository } from "@/features/decks/infrastructure/sqlite-deck-appearance.repository";
import { SQLiteDeckRepository } from "@/features/decks/infrastructure/sqlite-deck.repository";
import { NodeSqliteDatabase } from "./support/node-sqlite-database";
import { TEST_DECK_ID } from "./support/study-test-support";

describe("deck appearance persistence", () => {
  let database: NodeSqliteDatabase;

  beforeEach(async () => {
    database = new NodeSqliteDatabase();
    await database.runAsync(
      "INSERT INTO decks (id, title, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
      TEST_DECK_ID,
      "Test deck",
      "Untouched content",
      "2026-01-01T00:00:00.000Z",
      "2026-01-01T00:00:00.000Z"
    );
  });

  afterEach(() => database.close());

  it("updates and reloads appearance without changing deck content", async () => {
    const service = new DeckServiceImpl(
      new SQLiteDeckRepository(database.drizzle),
      new SQLiteDeckAppearanceRepository(database.drizzle)
    );
    const appearance = new DeckAppearance({
      accentColor: "#73D9FF",
      backgroundColor: "#0B151A",
      deckId: TEST_DECK_ID,
    });

    await service.saveAppearance(appearance);

    expect(await service.getAppearance(TEST_DECK_ID)).toEqual(appearance);
    expect((await service.findById(TEST_DECK_ID))?.description).toBe("Untouched content");
  });
});
