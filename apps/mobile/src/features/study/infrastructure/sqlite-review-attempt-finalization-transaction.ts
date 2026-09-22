import { and, eq, isNull, sql } from "drizzle-orm";

import type { LearningScheduler } from "@/features/learning-engine/domain/learning-scheduler";
import type { ReviewAttemptFinalizationTransaction } from "@/features/study/application/review-attempt-finalization-transaction";
import type { DrizzleDatabase } from "@/infrastructure/sqlite/drizzle-database";

import {
  deckProgress,
  decks,
  flashcardMemoryStates,
  flashcardReviewAttempts,
  flashcards,
  reviewEvents,
} from "@/infrastructure/sqlite/schema";

export class SQLiteReviewAttemptFinalizationTransaction<
  TRunResult = unknown,
> implements ReviewAttemptFinalizationTransaction {
  private readonly database: DrizzleDatabase<TRunResult>;
  private readonly scheduler: LearningScheduler;

  constructor(database: DrizzleDatabase<TRunResult>, scheduler: LearningScheduler) {
    this.database = database;
    this.scheduler = scheduler;
  }

  async finalizeAttempt(
    attemptId: string,
    finalizedAt: string,
    updatedAt: string
  ): Promise<boolean> {
    return this.database.transaction((transaction) => {
      const rows = transaction
        .select()
        .from(flashcardReviewAttempts)
        .where(
          and(
            eq(flashcardReviewAttempts.id, attemptId),
            isNull(flashcardReviewAttempts.finalizedAt)
          )
        )
        .limit(1)
        .all();
      const attempt = rows[0];
      if (!attempt) {
        return false;
      }

      if (attempt.rating !== null && attempt.ratedAt !== null) {
        const card = transaction
          .select({ deckId: flashcards.deckId, title: decks.title, version: decks.version })
          .from(flashcards)
          .innerJoin(decks, eq(decks.id, flashcards.deckId))
          .where(eq(flashcards.id, attempt.flashcardId))
          .limit(1)
          .all()[0];
        if (!card) {
          throw new Error(`Missing flashcard ${attempt.flashcardId} for review finalization`);
        }
        const memoryRows = transaction
          .select()
          .from(flashcardMemoryStates)
          .where(eq(flashcardMemoryStates.flashcardId, attempt.flashcardId))
          .limit(1)
          .all();
        const current = memoryRows[0];
        const currentState = current ? toMemoryState(current) : null;
        const nextState = this.scheduler.review(
          attempt.flashcardId,
          currentState,
          attempt.rating,
          attempt.ratedAt
        ).memoryState;
        const values = {
          createdAt: current?.createdAt ?? finalizedAt,
          dueAt: nextState.dueAt,
          difficulty: nextState.difficulty,
          deckId: card.deckId,
          elapsedDays: nextState.elapsedDays,
          flashcardId: nextState.flashcardId,
          lapses: nextState.lapses,
          lastReviewAt: nextState.lastReviewAt,
          learningSteps: nextState.learningSteps,
          reps: nextState.reps,
          scheduledDays: nextState.scheduledDays,
          stability: nextState.stability,
          state: nextState.state,
          updatedAt: finalizedAt,
        };
        transaction
          .insert(flashcardMemoryStates)
          .values(values)
          .onConflictDoUpdate({ target: flashcardMemoryStates.flashcardId, set: values })
          .run();
        transaction
          .insert(reviewEvents)
          .values({
            id: attempt.id,
            deckId: card.deckId,
            flashcardId: attempt.flashcardId,
            rating: attempt.rating,
            reviewedAt: attempt.ratedAt,
            finalizedAt,
          })
          .onConflictDoNothing()
          .run();
        transaction
          .insert(deckProgress)
          .values({
            deckId: card.deckId,
            title: card.title,
            version: card.version,
            lastReviewedAt: attempt.ratedAt,
            resolution: "active",
          })
          .onConflictDoUpdate({
            target: deckProgress.deckId,
            set: {
              title: card.title,
              version: card.version,
              lastReviewedAt: sql`max(${deckProgress.lastReviewedAt}, ${attempt.ratedAt})`,
            },
          })
          .run();
      }

      const finalized = transaction
        .update(flashcardReviewAttempts)
        .set({ finalizedAt, updatedAt })
        .where(
          and(
            eq(flashcardReviewAttempts.id, attemptId),
            isNull(flashcardReviewAttempts.finalizedAt)
          )
        )
        .returning({ id: flashcardReviewAttempts.id })
        .all();
      return finalized.length > 0;
    });
  }
}

function toMemoryState(row: typeof flashcardMemoryStates.$inferSelect) {
  return {
    createdAt: row.createdAt,
    dueAt: row.dueAt,
    difficulty: row.difficulty,
    elapsedDays: row.elapsedDays,
    flashcardId: row.flashcardId,
    lapses: row.lapses,
    lastReviewAt: row.lastReviewAt,
    learningSteps: row.learningSteps,
    reps: row.reps,
    scheduledDays: row.scheduledDays,
    stability: row.stability,
    state: row.state,
    updatedAt: row.updatedAt,
  };
}
