import { eq } from "drizzle-orm";

import type { DeckId } from "@/features/decks/domain/deck.model";
import type { DismissedBundledDeckRepository } from "@/features/decks/domain/dismissed-bundled-deck.repository";
import type { DrizzleDatabase } from "@/infrastructure/sqlite/drizzle-database";

import { dismissedBundledDecks } from "@/infrastructure/sqlite/schema";

export class SQLiteDismissedBundledDeckRepository<
  TRunResult = unknown,
> implements DismissedBundledDeckRepository {
  private readonly database: DrizzleDatabase<TRunResult>;

  constructor(database: DrizzleDatabase<TRunResult>) {
    this.database = database;
  }

  async wasRemoved(id: DeckId): Promise<boolean> {
    const rows = await this.database
      .select({ id: dismissedBundledDecks.id })
      .from(dismissedBundledDecks)
      .where(eq(dismissedBundledDecks.deckId, id))
      .limit(1);
    return rows.length > 0;
  }
}
