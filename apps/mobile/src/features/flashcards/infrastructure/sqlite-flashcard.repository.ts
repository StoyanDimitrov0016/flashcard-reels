import { and, asc, eq, inArray, sql } from "drizzle-orm";

import type { FlashcardRepository } from "@/features/flashcards/domain/flashcard.repository";
import type { DrizzleDatabase } from "@/infrastructure/sqlite/drizzle-database";

import { type DeckId } from "@/features/decks/domain/deck.model";
import { Flashcard } from "@/features/flashcards/domain/flashcard.model";
import { flashcards } from "@/infrastructure/sqlite/schema";

export class SQLiteFlashcardRepository<TRunResult = unknown> implements FlashcardRepository {
  private readonly database: DrizzleDatabase<TRunResult>;

  constructor(database: DrizzleDatabase<TRunResult>) {
    this.database = database;
  }

  async countFlashcardsByDeckIds(deckIds: readonly DeckId[]): Promise<ReadonlyMap<DeckId, number>> {
    const counts = new Map<DeckId, number>(deckIds.map((deckId) => [deckId, 0]));
    if (deckIds.length === 0) {
      return counts;
    }

    const cardCount = sql<number>`count(*)`.as("cardCount");
    const rows = await this.database
      .select({ cardCount, deckId: flashcards.deckId })
      .from(flashcards)
      .where(and(inArray(flashcards.deckId, deckIds), eq(flashcards.active, true)))
      .groupBy(flashcards.deckId)
      .orderBy(asc(flashcards.deckId));
    for (const row of rows) {
      counts.set(row.deckId, row.cardCount);
    }
    return counts;
  }

  async findById(id: string): Promise<Flashcard | null> {
    const rows = await this.database
      .select()
      .from(flashcards)
      .where(eq(flashcards.id, id))
      .limit(1);
    const row = rows[0];
    return row ? this.toModel(row) : null;
  }

  async list(): Promise<Flashcard[]> {
    const rows = await this.database
      .select()
      .from(flashcards)
      .where(eq(flashcards.active, true))
      .orderBy(asc(flashcards.createdAt), asc(flashcards.id));
    return rows.map((row) => this.toModel(row));
  }

  async listByDeckId(deckId: DeckId): Promise<Flashcard[]> {
    const rows = await this.database
      .select()
      .from(flashcards)
      .where(and(eq(flashcards.deckId, deckId), eq(flashcards.active, true)))
      .orderBy(asc(flashcards.order), asc(flashcards.id));
    return rows.map((row) => this.toModel(row));
  }

  async save(flashcard: Flashcard): Promise<void> {
    await this.database
      .insert(flashcards)
      .values({
        answer: flashcard.answer,
        createdAt: flashcard.createdAt,
        deckId: flashcard.deckId,
        order: flashcard.order,
        active: flashcard.active,
        id: flashcard.id,
        question: flashcard.question,
        updatedAt: flashcard.updatedAt,
      })
      .onConflictDoUpdate({
        target: flashcards.id,
        set: {
          answer: flashcard.answer,
          deckId: flashcard.deckId,
          order: flashcard.order,
          active: flashcard.active,
          question: flashcard.question,
          updatedAt: flashcard.updatedAt,
        },
      });
  }

  private toModel(row: typeof flashcards.$inferSelect): Flashcard {
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
}
