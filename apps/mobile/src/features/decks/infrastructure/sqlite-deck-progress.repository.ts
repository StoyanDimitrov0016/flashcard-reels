import { asc, eq } from "drizzle-orm";

import type { DeckProgressRepository } from "@/features/decks/domain/deck-progress.repository";
import type { DrizzleDatabase } from "@/infrastructure/sqlite/drizzle-database";

import { deckProgress } from "@/infrastructure/sqlite/schema";

export class SQLiteDeckProgressRepository<TRunResult = unknown> implements DeckProgressRepository {
  private readonly database: DrizzleDatabase<TRunResult>;

  constructor(database: DrizzleDatabase<TRunResult>) {
    this.database = database;
  }

  async listPending() {
    const records = await this.database
      .select()
      .from(deckProgress)
      .where(eq(deckProgress.resolution, "pending"))
      .orderBy(asc(deckProgress.title), asc(deckProgress.deckId));
    return records.map(({ deckId, title, lastReviewedAt }) => ({ deckId, title, lastReviewedAt }));
  }
}
