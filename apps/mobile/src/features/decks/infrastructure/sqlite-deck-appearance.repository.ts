import { asc, eq, inArray } from "drizzle-orm";

import {
  DeckAppearance,
  isDeckAppearancePresetId,
} from "@/features/decks/domain/deck-appearance.model";
import type { DeckAppearanceRepository } from "@/features/decks/domain/deck-appearance.repository";
import type { DeckId } from "@/features/decks/domain/deck.model";
import type { DrizzleDatabase } from "@/infrastructure/sqlite/drizzle-database";
import { deckAppearances } from "@/infrastructure/sqlite/schema";

export class SQLiteDeckAppearanceRepository<
  TRunResult = unknown,
> implements DeckAppearanceRepository {
  private readonly database: DrizzleDatabase<TRunResult>;

  constructor(database: DrizzleDatabase<TRunResult>) {
    this.database = database;
  }

  async findByDeckId(deckId: DeckId): Promise<DeckAppearance | null> {
    const rows = await this.database
      .select()
      .from(deckAppearances)
      .where(eq(deckAppearances.deckId, deckId))
      .limit(1);
    const row = rows[0];
    return row ? this.toModel(row) : null;
  }

  async findAppearancesByDeckIds(deckIds: readonly DeckId[]): Promise<DeckAppearance[]> {
    if (deckIds.length === 0) {
      return [];
    }
    const rows = await this.database
      .select()
      .from(deckAppearances)
      .where(inArray(deckAppearances.deckId, deckIds))
      .orderBy(asc(deckAppearances.deckId));
    return rows.map((row) => this.toModel(row));
  }

  async save(appearance: DeckAppearance): Promise<void> {
    await this.database
      .insert(deckAppearances)
      .values({
        deckId: appearance.deckId,
        presetId: appearance.presetId,
      })
      .onConflictDoUpdate({
        target: deckAppearances.deckId,
        set: {
          presetId: appearance.presetId,
        },
      });
  }

  private toModel(row: typeof deckAppearances.$inferSelect): DeckAppearance {
    if (!isDeckAppearancePresetId(row.presetId)) {
      throw new Error(`Unknown deck appearance preset ${row.presetId}`);
    }
    return new DeckAppearance({
      deckId: row.deckId,
      presetId: row.presetId,
    });
  }
}
