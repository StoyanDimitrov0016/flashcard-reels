import type { SQLiteDatabase } from "expo-sqlite";

import {
  Deck as DeckModel,
  DeckIdSchema,
  type Deck,
  type DeckId,
} from "@/features/decks/domain/deck.model";
import type { DeckRepository } from "@/features/decks/domain/deck.repository";
import { z } from "zod";

const DeckRowSchema = z.compile(
  z.object({
    created_at: z.string(),
    description: z.string(),
    id: DeckIdSchema,
    title: z.string(),
    updated_at: z.string(),
  })
);
type DeckRow = z.infer<typeof DeckRowSchema>;

export class SQLiteDeckRepository implements DeckRepository {
  private readonly database: SQLiteDatabase;

  constructor(database: SQLiteDatabase) {
    this.database = database;
  }

  async findById(id: DeckId): Promise<Deck | null> {
    const row = await this.database.getFirstAsync<unknown>(
      "SELECT id, title, description, created_at, updated_at FROM decks WHERE id = ?",
      id
    );
    if (!row) {
      return null;
    }
    return this.toModel(DeckRowSchema.parse(row));
  }

  async list(): Promise<Deck[]> {
    const rows = await this.database.getAllAsync<unknown>(
      "SELECT id, title, description, created_at, updated_at FROM decks ORDER BY title"
    );
    return rows.map((row) => this.toModel(DeckRowSchema.parse(row)));
  }

  async save(deck: Deck): Promise<void> {
    await this.database.runAsync(
      `INSERT INTO decks (id, title, description, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         title = excluded.title,
         description = excluded.description,
         updated_at = excluded.updated_at`,
      deck.id,
      deck.title,
      deck.description,
      deck.createdAt,
      deck.updatedAt
    );
  }

  private toModel(row: DeckRow): Deck {
    return new DeckModel({
      description: row.description,
      id: row.id,
      title: row.title,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }
}
