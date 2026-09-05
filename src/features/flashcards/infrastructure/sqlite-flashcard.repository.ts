import type { SQLiteDatabase } from "expo-sqlite";

import { Flashcard } from "@/features/flashcards/domain/flashcard.model";
import type { FlashcardRepository } from "@/features/flashcards/domain/flashcard.repository";
import { DeckIdSchema, type DeckId } from "@/features/decks/domain/deck.model";
import { z } from "zod";

const FlashcardRowSchema = z.compile(
  z.object({
    answer: z.string(),
    created_at: z.string(),
    deck_id: DeckIdSchema,
    id: z.string(),
    question: z.string(),
    updated_at: z.string(),
  })
);
type FlashcardRow = z.infer<typeof FlashcardRowSchema>;

const FlashcardCountRowSchema = z.compile(
  z.object({
    card_count: z.number().int().nonnegative(),
    deck_id: DeckIdSchema,
  })
);
type FlashcardCountRow = z.infer<typeof FlashcardCountRowSchema>;

export class SQLiteFlashcardRepository implements FlashcardRepository {
  private readonly database: SQLiteDatabase;

  constructor(database: SQLiteDatabase) {
    this.database = database;
  }

  async countFlashcardsByDeckIds(deckIds: readonly DeckId[]): Promise<ReadonlyMap<DeckId, number>> {
    const counts = new Map<DeckId, number>(deckIds.map((deckId) => [deckId, 0]));
    if (deckIds.length === 0) {
      return counts;
    }

    const placeholders = deckIds.map(() => "?").join(", ");
    const rows = await this.database.getAllAsync<unknown>(
      `SELECT deck_id, COUNT(*) AS card_count
       FROM flashcards
       WHERE deck_id IN (${placeholders})
       GROUP BY deck_id
       ORDER BY deck_id`,
      ...deckIds
    );
    for (const row of rows) {
      const parsedRow: FlashcardCountRow = FlashcardCountRowSchema.parse(row);
      counts.set(parsedRow.deck_id, parsedRow.card_count);
    }
    return counts;
  }

  async findById(id: string): Promise<Flashcard | null> {
    const row = await this.database.getFirstAsync<unknown>(
      "SELECT id, deck_id, question, answer, created_at, updated_at FROM flashcards WHERE id = ?",
      id
    );
    if (!row) {
      return null;
    }
    return this.toModel(FlashcardRowSchema.parse(row));
  }

  async list(): Promise<Flashcard[]> {
    const rows = await this.database.getAllAsync<unknown>(
      "SELECT id, deck_id, question, answer, created_at, updated_at FROM flashcards ORDER BY created_at, id"
    );
    return rows.map((row) => this.toModel(FlashcardRowSchema.parse(row)));
  }

  async listByDeckId(deckId: DeckId): Promise<Flashcard[]> {
    const rows = await this.database.getAllAsync<unknown>(
      "SELECT id, deck_id, question, answer, created_at, updated_at FROM flashcards WHERE deck_id = ? ORDER BY created_at, id",
      deckId
    );
    return rows.map((row) => this.toModel(FlashcardRowSchema.parse(row)));
  }

  async save(flashcard: Flashcard): Promise<void> {
    await this.database.runAsync(
      `INSERT INTO flashcards (id, deck_id, question, answer, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         deck_id = excluded.deck_id,
         question = excluded.question,
         answer = excluded.answer,
         updated_at = excluded.updated_at`,
      flashcard.id,
      flashcard.deckId,
      flashcard.question,
      flashcard.answer,
      flashcard.createdAt,
      flashcard.updatedAt
    );
  }

  private toModel(row: FlashcardRow): Flashcard {
    return new Flashcard({
      answer: row.answer,
      createdAt: row.created_at,
      deckId: row.deck_id,
      id: row.id,
      question: row.question,
      updatedAt: row.updated_at,
    });
  }
}
