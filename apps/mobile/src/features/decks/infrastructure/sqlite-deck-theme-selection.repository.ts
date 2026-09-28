import { asc, eq, inArray } from "drizzle-orm";

import type { DeckThemeSelectionRepository } from "@/features/decks/domain/deck-theme-selection.repository";
import type { DeckId } from "@/features/decks/domain/deck.model";
import type { DrizzleDatabase } from "@/infrastructure/sqlite/drizzle-database";
import type { IdGenerator } from "@/shared/domain/id-generator";

import {
  DeckThemeSelection,
  isDeckThemeId,
} from "@/features/decks/domain/deck-theme-selection.model";
import { deckThemeSelections } from "@/infrastructure/sqlite/schema";

export class SQLiteDeckThemeSelectionRepository<
  TRunResult = unknown,
> implements DeckThemeSelectionRepository {
  private readonly database: DrizzleDatabase<TRunResult>;
  private readonly idGenerator: IdGenerator;

  constructor(database: DrizzleDatabase<TRunResult>, idGenerator: IdGenerator) {
    this.database = database;
    this.idGenerator = idGenerator;
  }

  async findByDeckId(deckId: DeckId): Promise<DeckThemeSelection | null> {
    const rows = await this.database
      .select()
      .from(deckThemeSelections)
      .where(eq(deckThemeSelections.deckId, deckId))
      .limit(1);
    const row = rows[0];
    return row ? this.toModel(row) : null;
  }

  async findThemeSelectionsByDeckIds(deckIds: readonly DeckId[]): Promise<DeckThemeSelection[]> {
    if (deckIds.length === 0) {
      return [];
    }
    const rows = await this.database
      .select()
      .from(deckThemeSelections)
      .where(inArray(deckThemeSelections.deckId, deckIds))
      .orderBy(asc(deckThemeSelections.deckId));
    return rows.map((row) => this.toModel(row));
  }

  async save(themeSelection: DeckThemeSelection): Promise<void> {
    await this.database
      .insert(deckThemeSelections)
      .values({
        id: this.idGenerator.generate(),
        deckId: themeSelection.deckId,
        theme: themeSelection.theme,
      })
      .onConflictDoUpdate({
        target: deckThemeSelections.deckId,
        set: {
          theme: themeSelection.theme,
        },
      });
  }

  private toModel(row: typeof deckThemeSelections.$inferSelect): DeckThemeSelection {
    if (!isDeckThemeId(row.theme)) {
      throw new Error(`Unknown deck theme ${row.theme}`);
    }
    return new DeckThemeSelection({
      deckId: row.deckId,
      theme: row.theme,
    });
  }
}
