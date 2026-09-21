import { asc, eq, inArray } from "drizzle-orm";

import type { DeckRepository } from "@/features/decks/domain/deck.repository";
import type { DrizzleDatabase } from "@/infrastructure/sqlite/drizzle-database";

import { DeckCoverAssetSchema } from "@/features/decks/contracts/deck.schema";
import { Deck as DeckModel, type Deck, type DeckId } from "@/features/decks/domain/deck.model";
import {
  decks,
  deckAppearances,
  flashcardMemoryStates,
  flashcardReviewAttempts,
  flashcards,
  learnerProfiles,
  removedDecks,
  studySessionItems,
  studySessionRecurrences,
  studySessions,
} from "@/infrastructure/sqlite/schema";

export class SQLiteDeckRepository<TRunResult = unknown> implements DeckRepository {
  private readonly database: DrizzleDatabase<TRunResult>;

  constructor(database: DrizzleDatabase<TRunResult>) {
    this.database = database;
  }

  async findById(id: DeckId): Promise<Deck | null> {
    const rows = await this.database.select().from(decks).where(eq(decks.id, id)).limit(1);
    const row = rows[0];
    return row ? this.toModel(row) : null;
  }

  async findByIds(ids: readonly DeckId[]): Promise<Deck[]> {
    if (ids.length === 0) {
      return [];
    }
    const rows = await this.database
      .select()
      .from(decks)
      .where(inArray(decks.id, ids))
      .orderBy(asc(decks.title), asc(decks.id));
    return rows.map((row) => this.toModel(row));
  }

  async list(): Promise<Deck[]> {
    const rows = await this.database.select().from(decks).orderBy(asc(decks.title), asc(decks.id));
    return rows.map((row) => this.toModel(row));
  }

  async save(deck: Deck): Promise<void> {
    await this.database
      .insert(decks)
      .values({
        createdAt: deck.createdAt,
        description: deck.description,
        id: deck.id,
        coverAsset: deck.coverAsset,
        title: deck.title,
        version: deck.version,
        updatedAt: deck.updatedAt,
      })
      .onConflictDoUpdate({
        target: decks.id,
        set: {
          description: deck.description,
          title: deck.title,
          coverAsset: deck.coverAsset,
          version: deck.version,
          updatedAt: deck.updatedAt,
        },
      });
  }

  async remove(id: DeckId): Promise<void> {
    this.database.transaction((transaction) => {
      transaction.insert(removedDecks).values({ id }).onConflictDoNothing().run();
      const cardIds = transaction
        .select({ id: flashcards.id })
        .from(flashcards)
        .where(eq(flashcards.deckId, id))
        .all()
        .map((card) => card.id);

      transaction.delete(studySessions).where(eq(studySessions.deckId, id)).run();
      if (cardIds.length > 0) {
        transaction
          .delete(studySessionRecurrences)
          .where(inArray(studySessionRecurrences.flashcardId, cardIds))
          .run();
        transaction
          .delete(flashcardReviewAttempts)
          .where(inArray(flashcardReviewAttempts.flashcardId, cardIds))
          .run();
        transaction
          .delete(studySessionItems)
          .where(inArray(studySessionItems.flashcardId, cardIds))
          .run();
        transaction
          .delete(flashcardMemoryStates)
          .where(inArray(flashcardMemoryStates.flashcardId, cardIds))
          .run();
        transaction
          .delete(learnerProfiles)
          .where(inArray(learnerProfiles.flashcardId, cardIds))
          .run();
      }
      transaction.delete(flashcards).where(eq(flashcards.deckId, id)).run();
      transaction.delete(deckAppearances).where(eq(deckAppearances.deckId, id)).run();
      transaction.delete(decks).where(eq(decks.id, id)).run();
    });
  }

  async wasRemoved(id: DeckId): Promise<boolean> {
    const rows = await this.database
      .select({ id: removedDecks.id })
      .from(removedDecks)
      .where(eq(removedDecks.id, id))
      .limit(1);
    return rows.length > 0;
  }

  async findVersion(id: DeckId): Promise<number | null> {
    const rows = await this.database
      .select({ version: decks.version })
      .from(decks)
      .where(eq(decks.id, id))
      .limit(1);
    return rows[0]?.version ?? null;
  }

  private toModel(row: typeof decks.$inferSelect): Deck {
    return new DeckModel({
      description: row.description,
      id: row.id,
      title: row.title,
      coverAsset: DeckCoverAssetSchema.parse(row.coverAsset),
      version: row.version,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
