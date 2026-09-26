import { and, asc, eq, isNull, ne, or } from "drizzle-orm";

import type { DeckId } from "@/features/decks/domain/deck.model";
import type { FlashcardAvailabilityQuery } from "@/features/flashcards/domain/flashcard-availability.query";
import type { DrizzleDatabase } from "@/infrastructure/sqlite/drizzle-database";

import { Flashcard } from "@/features/flashcards/domain/flashcard.model";
import { deckProgress, flashcards } from "@/infrastructure/sqlite/schema";

export class SQLiteFlashcardAvailabilityQuery<
  TRunResult = unknown,
> implements FlashcardAvailabilityQuery {
  private readonly database: DrizzleDatabase<TRunResult>;

  constructor(database: DrizzleDatabase<TRunResult>) {
    this.database = database;
  }

  async listAvailableFlashcards(): Promise<Flashcard[]> {
    const rows = await this.database
      .select({ flashcard: flashcards })
      .from(flashcards)
      .leftJoin(deckProgress, eq(deckProgress.deckId, flashcards.deckId))
      .where(
        and(
          eq(flashcards.active, true),
          or(isNull(deckProgress.deckId), ne(deckProgress.resolution, "pending"))
        )
      )
      .orderBy(asc(flashcards.createdAt), asc(flashcards.id));
    return rows.map(({ flashcard }) => toModel(flashcard));
  }

  async listAvailableFlashcardsByDeckId(deckId: DeckId): Promise<Flashcard[]> {
    const rows = await this.database
      .select({ flashcard: flashcards })
      .from(flashcards)
      .leftJoin(deckProgress, eq(deckProgress.deckId, flashcards.deckId))
      .where(
        and(
          eq(flashcards.deckId, deckId),
          eq(flashcards.active, true),
          or(isNull(deckProgress.deckId), ne(deckProgress.resolution, "pending"))
        )
      )
      .orderBy(asc(flashcards.order), asc(flashcards.id));
    return rows.map(({ flashcard }) => toModel(flashcard));
  }
}

function toModel(row: typeof flashcards.$inferSelect): Flashcard {
  return new Flashcard({
    answer: row.answer,
    createdAt: row.createdAt,
    deckId: row.deckId,
    order: row.order,
    active: row.active,
    id: row.id,
    question: row.question,
    updatedAt: row.updatedAt,
  });
}
