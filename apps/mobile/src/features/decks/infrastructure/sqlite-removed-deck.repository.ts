import { eq } from "drizzle-orm";

import type { DeckId } from "@/features/decks/domain/deck.model";
import type { RemovedDeckRepository } from "@/features/decks/domain/removed-deck.repository";
import type { DrizzleDatabase } from "@/infrastructure/sqlite/drizzle-database";

import { removedDecks } from "@/infrastructure/sqlite/schema";

export class SQLiteRemovedDeckRepository<TRunResult = unknown> implements RemovedDeckRepository {
  private readonly database: DrizzleDatabase<TRunResult>;

  constructor(database: DrizzleDatabase<TRunResult>) {
    this.database = database;
  }

  async wasRemoved(id: DeckId): Promise<boolean> {
    const rows = await this.database
      .select({ id: removedDecks.id })
      .from(removedDecks)
      .where(eq(removedDecks.id, id))
      .limit(1);
    return rows.length > 0;
  }
}
