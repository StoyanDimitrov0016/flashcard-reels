import type { SQLiteDatabase } from "expo-sqlite";

import { DeckAppearance } from "@/features/decks/domain/deck-appearance.model";
import type { DeckAppearanceRepository } from "@/features/decks/domain/deck-appearance.repository";
import { DeckIdSchema, type DeckId } from "@/features/decks/domain/deck.model";
import { z } from "zod";

const DeckAppearanceRowSchema = z.compile(
  z.object({
    accent_color: z.string(),
    background_color: z.string(),
    deck_id: DeckIdSchema,
  })
);
type DeckAppearanceRow = z.infer<typeof DeckAppearanceRowSchema>;

export class SQLiteDeckAppearanceRepository implements DeckAppearanceRepository {
  private readonly database: SQLiteDatabase;

  constructor(database: SQLiteDatabase) {
    this.database = database;
  }

  async findByDeckId(deckId: DeckId): Promise<DeckAppearance | null> {
    const row = await this.database.getFirstAsync<unknown>(
      "SELECT deck_id, accent_color, background_color FROM deck_appearances WHERE deck_id = ?",
      deckId
    );
    if (!row) {
      return null;
    }
    return this.toModel(DeckAppearanceRowSchema.parse(row));
  }

  async save(appearance: DeckAppearance): Promise<void> {
    await this.database.runAsync(
      `INSERT INTO deck_appearances (deck_id, accent_color, background_color)
       VALUES (?, ?, ?)
       ON CONFLICT(deck_id) DO UPDATE SET
         accent_color = excluded.accent_color,
         background_color = excluded.background_color`,
      appearance.deckId,
      appearance.accentColor,
      appearance.backgroundColor
    );
  }

  private toModel(row: DeckAppearanceRow): DeckAppearance {
    return new DeckAppearance({
      accentColor: row.accent_color,
      backgroundColor: row.background_color,
      deckId: row.deck_id,
    });
  }
}
