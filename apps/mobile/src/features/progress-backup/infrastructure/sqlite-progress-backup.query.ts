import { asc, eq } from "drizzle-orm";

import type { ProgressBackupQuery } from "@/features/progress-backup/application/progress-backup.query";
import type { ProgressBackupDocument } from "@/features/progress-backup/contracts/progress-backup.schema";
import type { DrizzleDatabase } from "@/infrastructure/sqlite/drizzle-database";

import { defaultAppPreferences } from "@/features/preferences/domain/app-preferences";
import {
  learnerPreferences,
  deckThemeSelections,
  deckProgress,
  decks,
  flashcardMemoryStates,
  flashcardProgress,
  progressBackupState,
  flashcardReviewEvents,
} from "@/infrastructure/sqlite/schema";

export class SQLiteProgressBackupQuery<TRunResult = unknown> implements ProgressBackupQuery {
  private readonly database: DrizzleDatabase<TRunResult>;

  constructor(database: DrizzleDatabase<TRunResult>) {
    this.database = database;
  }

  async read(exportedAt: string): Promise<ProgressBackupDocument> {
    return this.database.transaction((transaction) => {
      const progress = transaction
        .select({
          flashcardId: flashcardProgress.flashcardId,
          deckId: flashcardProgress.deckId,
          reviewCount: flashcardProgress.reviewCount,
          againCount: flashcardProgress.againCount,
          hardCount: flashcardProgress.hardCount,
          goodCount: flashcardProgress.goodCount,
          easyCount: flashcardProgress.easyCount,
          firstReviewedAt: flashcardProgress.firstReviewedAt,
          lastReviewedAt: flashcardProgress.lastReviewedAt,
          resetAt: flashcardProgress.resetAt,
          createdAt: flashcardProgress.createdAt,
          updatedAt: flashcardProgress.updatedAt,
        })
        .from(flashcardProgress)
        .orderBy(asc(flashcardProgress.flashcardId))
        .all();
      for (const row of progress) {
        // Card creation dates come from packages, which also allow offsets and omitted milliseconds.
        // Normalize only the backup snapshot; leave the original persisted timestamps untouched.
        row.createdAt = new Date(row.createdAt).toISOString();
      }
      return {
        format: "flashcard-reels-learner-data" as const,
        version: 1 as const,
        exportedAt,
        learnerPreferences: transaction
          .select({
            colorMode: learnerPreferences.colorMode,
            studyIslandPosition: learnerPreferences.studyIslandPosition,
            ratingDirection: learnerPreferences.ratingDirection,
            audioEnabled: learnerPreferences.audioEnabled,
            audioSide: learnerPreferences.audioSide,
            readingEnabled: learnerPreferences.readingEnabled,
            readingSide: learnerPreferences.readingSide,
            hapticsEnabled: learnerPreferences.hapticsEnabled,
            updatedAt: learnerPreferences.updatedAt,
          })
          .from(learnerPreferences)
          .get() ?? { ...defaultAppPreferences, updatedAt: exportedAt },
        deckThemeSelections: transaction
          .select({ deckId: deckThemeSelections.deckId, theme: deckThemeSelections.theme })
          .from(deckThemeSelections)
          .orderBy(asc(deckThemeSelections.deckId))
          .all(),
        deckProgress: transaction
          .select({
            deckId: deckProgress.deckId,
            title: deckProgress.title,
            revision: deckProgress.revision,
            lastReviewedAt: deckProgress.lastReviewedAt,
            status: deckProgress.status,
          })
          .from(deckProgress)
          .orderBy(asc(deckProgress.deckId))
          .all(),
        flashcardProgress: progress,
        flashcardMemoryStates: transaction
          .select({
            flashcardId: flashcardMemoryStates.flashcardId,
            deckId: flashcardMemoryStates.deckId,
            state: flashcardMemoryStates.state,
            dueAt: flashcardMemoryStates.dueAt,
            stability: flashcardMemoryStates.stability,
            difficulty: flashcardMemoryStates.difficulty,
            elapsedDays: flashcardMemoryStates.elapsedDays,
            scheduledDays: flashcardMemoryStates.scheduledDays,
            reps: flashcardMemoryStates.reps,
            lapses: flashcardMemoryStates.lapses,
            learningSteps: flashcardMemoryStates.learningSteps,
            lastReviewAt: flashcardMemoryStates.lastReviewAt,
            createdAt: flashcardMemoryStates.createdAt,
            updatedAt: flashcardMemoryStates.updatedAt,
          })
          .from(flashcardMemoryStates)
          .orderBy(asc(flashcardMemoryStates.flashcardId))
          .all(),
        flashcardReviewEvents: transaction
          .select()
          .from(flashcardReviewEvents)
          .orderBy(asc(flashcardReviewEvents.id))
          .all(),
      };
    });
  }

  async readSafetyCopyFileName(): Promise<string | null> {
    const state = this.database
      .select({ fileName: progressBackupState.safetyCopyFileName })
      .from(progressBackupState)
      .where(eq(progressBackupState.id, 1))
      .get();
    return state?.fileName ?? null;
  }

  async readInstalledDeckIds(): Promise<ReadonlySet<string>> {
    const rows = this.database.select({ id: decks.id }).from(decks).all();
    return new Set(rows.map((row) => row.id));
  }
}
