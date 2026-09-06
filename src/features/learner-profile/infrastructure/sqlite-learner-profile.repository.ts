import { asc, eq, inArray } from "drizzle-orm";

import type { DeckId } from "@/features/decks/domain/deck.model";
import { LearnerProfile } from "@/features/learner-profile/domain/learner-profile.model";
import type { LearnerProfileRepository } from "@/features/learner-profile/domain/learner-profile.repository";
import type { DrizzleDatabase } from "@/infrastructure/sqlite/drizzle-database";
import { flashcards, learnerProfiles } from "@/infrastructure/sqlite/schema";

export class SQLiteLearnerProfileRepository<
  TRunResult = unknown,
> implements LearnerProfileRepository {
  private readonly database: DrizzleDatabase<TRunResult>;

  constructor(database: DrizzleDatabase<TRunResult>) {
    this.database = database;
  }

  async findByFlashcardId(flashcardId: string): Promise<LearnerProfile | null> {
    const profiles = await this.findByFlashcardIds([flashcardId]);
    return profiles.get(flashcardId) ?? null;
  }

  async findByFlashcardIds(
    flashcardIds: readonly string[]
  ): Promise<ReadonlyMap<string, LearnerProfile>> {
    if (flashcardIds.length === 0) {
      return new Map();
    }
    const rows = await this.database
      .select()
      .from(learnerProfiles)
      .where(inArray(learnerProfiles.flashcardId, flashcardIds))
      .orderBy(asc(learnerProfiles.flashcardId));
    return new Map(rows.map((row) => [row.flashcardId, this.toModel(row)] as const));
  }

  async resetCard(flashcardId: string, resetAt: string): Promise<void> {
    this.database.transaction((transaction) => {
      const card = transaction
        .select({ createdAt: flashcards.createdAt })
        .from(flashcards)
        .where(eq(flashcards.id, flashcardId))
        .limit(1)
        .all()[0];
      if (!card) {
        throw new Error(`Missing flashcard ${flashcardId}`);
      }
      transaction
        .insert(learnerProfiles)
        .values(this.zeroState(flashcardId, card.createdAt, resetAt))
        .onConflictDoUpdate({
          target: learnerProfiles.flashcardId,
          set: this.resetValues(resetAt),
        })
        .run();
    });
  }

  async resetDeck(deckId: DeckId, resetAt: string): Promise<void> {
    this.database.transaction((transaction) => {
      const cards = transaction
        .select({ createdAt: flashcards.createdAt, id: flashcards.id })
        .from(flashcards)
        .where(eq(flashcards.deckId, deckId))
        .all();
      for (const card of cards) {
        transaction
          .insert(learnerProfiles)
          .values(this.zeroState(card.id, card.createdAt, resetAt))
          .onConflictDoUpdate({
            target: learnerProfiles.flashcardId,
            set: this.resetValues(resetAt),
          })
          .run();
      }
    });
  }

  async resetAll(resetAt: string): Promise<void> {
    this.database.transaction((transaction) => {
      const cards = transaction
        .select({ createdAt: flashcards.createdAt, id: flashcards.id })
        .from(flashcards)
        .orderBy(asc(flashcards.id))
        .all();
      for (const card of cards) {
        transaction
          .insert(learnerProfiles)
          .values(this.zeroState(card.id, card.createdAt, resetAt))
          .onConflictDoUpdate({
            target: learnerProfiles.flashcardId,
            set: this.resetValues(resetAt),
          })
          .run();
      }
    });
  }

  private resetValues(resetAt: string) {
    return {
      againCount: 0,
      easyCount: 0,
      firstReviewedAt: null,
      goodCount: 0,
      hardCount: 0,
      lastReviewedAt: null,
      resetAt,
      reviewCount: 0,
      updatedAt: resetAt,
    };
  }

  private toModel(row: typeof learnerProfiles.$inferSelect): LearnerProfile {
    return new LearnerProfile({
      againCount: row.againCount,
      createdAt: row.createdAt,
      easyCount: row.easyCount,
      firstReviewedAt: row.firstReviewedAt,
      flashcardId: row.flashcardId,
      goodCount: row.goodCount,
      hardCount: row.hardCount,
      lastReviewedAt: row.lastReviewedAt,
      resetAt: row.resetAt,
      reviewCount: row.reviewCount,
      updatedAt: row.updatedAt,
    });
  }

  private zeroState(flashcardId: string, createdAt: string, resetAt: string) {
    return {
      againCount: 0,
      createdAt,
      easyCount: 0,
      firstReviewedAt: null,
      flashcardId,
      goodCount: 0,
      hardCount: 0,
      lastReviewedAt: null,
      resetAt,
      reviewCount: 0,
      updatedAt: resetAt,
    };
  }
}
