import { and, asc, eq, inArray, sql } from "drizzle-orm";

import type {
  ArchivedDeckProgress,
  PendingDeckProgress,
} from "@/features/decks/domain/archived-deck-progress";
import type { DeckRepository } from "@/features/decks/domain/deck.repository";
import type { DrizzleDatabase } from "@/infrastructure/sqlite/drizzle-database";

import { DeckCoverAssetSchema } from "@/features/decks/contracts/deck.schema";
import { Deck as DeckModel, type Deck, type DeckId } from "@/features/decks/domain/deck.model";
import {
  decks,
  deckAppearances,
  deckProgress,
  flashcardMemoryStates,
  flashcardReviewAttempts,
  flashcards,
  learnerProfiles,
  removedDecks,
  reviewEvents,
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
      const savedProgress = transaction
        .select({ deckId: deckProgress.deckId })
        .from(deckProgress)
        .where(eq(deckProgress.deckId, id))
        .get();
      transaction
        .update(deckProgress)
        .set({ resolution: "archived" })
        .where(eq(deckProgress.deckId, id))
        .run();
      if (!savedProgress) {
        transaction.delete(learnerProfiles).where(eq(learnerProfiles.deckId, id)).run();
        transaction.delete(flashcardMemoryStates).where(eq(flashcardMemoryStates.deckId, id)).run();
      }
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

  async listArchivedProgress(): Promise<ArchivedDeckProgress[]> {
    const records = await this.database
      .select()
      .from(deckProgress)
      .where(eq(deckProgress.resolution, "archived"))
      .orderBy(asc(deckProgress.title), asc(deckProgress.deckId));
    return Promise.all(
      records.map(async (record): Promise<ArchivedDeckProgress> => {
        const [events, profiles, memory] = await Promise.all([
          this.database
            .select({
              bytes: sql<number>`coalesce(sum(length(${reviewEvents.id}) + length(${reviewEvents.deckId}) + length(${reviewEvents.flashcardId}) + length(${reviewEvents.rating}) + length(${reviewEvents.reviewedAt}) + length(${reviewEvents.finalizedAt}) + 64), 0)`,
            })
            .from(reviewEvents)
            .where(eq(reviewEvents.deckId, record.deckId)),
          this.database
            .select({
              reviewCount: sql<number>`coalesce(sum(${learnerProfiles.reviewCount}), 0)`,
              reviewedCardCount: sql<number>`sum(case when ${learnerProfiles.reviewCount} > 0 then 1 else 0 end)`,
              bytes: sql<number>`coalesce(sum(length(${learnerProfiles.flashcardId}) + length(${learnerProfiles.deckId}) + 160), 0)`,
            })
            .from(learnerProfiles)
            .where(eq(learnerProfiles.deckId, record.deckId)),
          this.database
            .select({
              bytes: sql<number>`coalesce(sum(length(${flashcardMemoryStates.flashcardId}) + length(${flashcardMemoryStates.deckId}) + 160), 0)`,
            })
            .from(flashcardMemoryStates)
            .where(eq(flashcardMemoryStates.deckId, record.deckId)),
        ]);
        return {
          deckId: record.deckId,
          title: record.title,
          version: record.version,
          lastReviewedAt: record.lastReviewedAt,
          reviewCount: profiles[0]?.reviewCount ?? 0,
          reviewedCardCount: profiles[0]?.reviewedCardCount ?? 0,
          estimatedBytes:
            (events[0]?.bytes ?? 0) +
            (profiles[0]?.bytes ?? 0) +
            (memory[0]?.bytes ?? 0) +
            record.title.length +
            96,
        };
      })
    );
  }

  async listPendingProgress(): Promise<PendingDeckProgress[]> {
    const records = await this.database
      .select()
      .from(deckProgress)
      .where(eq(deckProgress.resolution, "pending"))
      .orderBy(asc(deckProgress.title), asc(deckProgress.deckId));
    return records.map((record) => ({
      deckId: record.deckId,
      title: record.title,
      lastReviewedAt: record.lastReviewedAt,
    }));
  }

  async continueProgress(id: DeckId): Promise<void> {
    this.database.transaction((transaction) => {
      const installed = transaction
        .select({ id: decks.id })
        .from(decks)
        .where(eq(decks.id, id))
        .get();
      if (!installed) {
        throw new Error(`Deck ${id} is not installed`);
      }
      const resolved = transaction
        .update(deckProgress)
        .set({ resolution: "active" })
        .where(and(eq(deckProgress.deckId, id), eq(deckProgress.resolution, "pending")))
        .returning({ deckId: deckProgress.deckId })
        .all();
      if (resolved.length === 0) {
        throw new Error(`Deck ${id} has no pending saved progress`);
      }
    });
  }

  async deleteProgress(id: DeckId): Promise<void> {
    this.database.transaction((transaction) => {
      const record = transaction
        .select({ resolution: deckProgress.resolution })
        .from(deckProgress)
        .where(eq(deckProgress.deckId, id))
        .get();
      if (record?.resolution === "active") {
        throw new Error(`Deck ${id} must be archived or pending before deleting saved progress`);
      }
      transaction.delete(reviewEvents).where(eq(reviewEvents.deckId, id)).run();
      transaction.delete(learnerProfiles).where(eq(learnerProfiles.deckId, id)).run();
      transaction.delete(flashcardMemoryStates).where(eq(flashcardMemoryStates.deckId, id)).run();
      transaction.delete(deckProgress).where(eq(deckProgress.deckId, id)).run();
    });
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
