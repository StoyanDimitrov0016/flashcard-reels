import { z } from "zod";

const Id = z.uuid();
// SQLite compares these timestamps as text, so backups must keep the app's UTC form.
const Timestamp = z.iso
  .datetime()
  .refine(
    (value) => new Date(value).toISOString() === value,
    "Expected a UTC timestamp with milliseconds"
  );
const Count = z.number().int().nonnegative();

const DeckProgress = z
  .object({
    deckId: Id,
    title: z.string().min(1),
    version: z.number().int().positive(),
    lastReviewedAt: Timestamp,
    resolution: z.enum(["active", "archived", "pending"]),
  })
  .strict();

const FlashcardProgress = z
  .object({
    flashcardId: Id,
    deckId: Id,
    reviewCount: Count,
    againCount: Count,
    hardCount: Count,
    goodCount: Count,
    easyCount: Count,
    firstReviewedAt: Timestamp.nullable(),
    lastReviewedAt: Timestamp.nullable(),
    resetAt: Timestamp.nullable(),
    createdAt: Timestamp,
    updatedAt: Timestamp,
  })
  .strict()
  .refine(
    (row) => row.reviewCount === row.againCount + row.hardCount + row.goodCount + row.easyCount,
    "Flashcard review counts do not add up"
  )
  .refine(
    (row) =>
      row.reviewCount === 0
        ? row.firstReviewedAt === null && row.lastReviewedAt === null
        : row.firstReviewedAt !== null && row.lastReviewedAt !== null,
    "Flashcard review timestamps do not match its count"
  );

const FlashcardMemoryState = z
  .object({
    flashcardId: Id,
    deckId: Id,
    state: z.enum(["new", "learning", "review", "relearning"]),
    dueAt: Timestamp,
    stability: z.number(),
    difficulty: z.number(),
    elapsedDays: Count,
    scheduledDays: Count,
    reps: Count,
    lapses: Count,
    learningSteps: Count,
    lastReviewAt: Timestamp.nullable(),
    createdAt: Timestamp,
    updatedAt: Timestamp,
  })
  .strict();

const ReviewEvent = z
  .object({
    id: Id,
    deckId: Id,
    flashcardId: Id,
    rating: z.enum(["again", "hard", "good", "easy"]),
    reviewedAt: Timestamp,
    finalizedAt: Timestamp,
  })
  .strict();

const ProgressBackupDocumentUncompiledSchema = z
  .object({
    format: z.literal("flashcard-reels-progress"),
    version: z.literal(1),
    exportedAt: Timestamp,
    deckProgress: z.array(DeckProgress),
    flashcardProgress: z.array(FlashcardProgress),
    flashcardMemoryStates: z.array(FlashcardMemoryState),
    reviewEvents: z.array(ReviewEvent),
  })
  .strict()
  .superRefine((document, context) => {
    const cardDecks = new Map<string, string>();
    const studiedDeckIds = new Set(document.deckProgress.map((row) => row.deckId));
    const checkOwnership = (flashcardId: string, deckId: string, path: (string | number)[]) => {
      const existing = cardDecks.get(flashcardId);
      if (existing && existing !== deckId) {
        context.addIssue({ code: "custom", path, message: "Flashcard belongs to another deck" });
      }
      cardDecks.set(flashcardId, deckId);
    };
    const deckIds = new Set<string>();
    for (const [index, row] of document.deckProgress.entries()) {
      if (deckIds.has(row.deckId)) {
        context.addIssue({
          code: "custom",
          path: ["deckProgress", index, "deckId"],
          message: "Duplicate deck ID",
        });
      }
      deckIds.add(row.deckId);
    }
    const progressIds = new Set<string>();
    for (const [index, row] of document.flashcardProgress.entries()) {
      if (progressIds.has(row.flashcardId)) {
        context.addIssue({
          code: "custom",
          path: ["flashcardProgress", index, "flashcardId"],
          message: "Duplicate flashcard progress",
        });
      }
      progressIds.add(row.flashcardId);
      checkOwnership(row.flashcardId, row.deckId, ["flashcardProgress", index, "deckId"]);
    }
    const memoryIds = new Set<string>();
    for (const [index, row] of document.flashcardMemoryStates.entries()) {
      if (memoryIds.has(row.flashcardId)) {
        context.addIssue({
          code: "custom",
          path: ["flashcardMemoryStates", index, "flashcardId"],
          message: "Duplicate flashcard memory state",
        });
      }
      memoryIds.add(row.flashcardId);
      checkOwnership(row.flashcardId, row.deckId, ["flashcardMemoryStates", index, "deckId"]);
      if (!studiedDeckIds.has(row.deckId)) {
        context.addIssue({
          code: "custom",
          path: ["flashcardMemoryStates", index, "deckId"],
          message: "Missing deck progress for memory state",
        });
      }
    }
    const eventIds = new Set<string>();
    const eventStats = new Map<
      string,
      {
        again: number;
        hard: number;
        good: number;
        easy: number;
        first: string;
        last: string;
      }
    >();
    const latestDeckReview = new Map<string, string>();
    for (const [index, row] of document.reviewEvents.entries()) {
      if (eventIds.has(row.id)) {
        context.addIssue({
          code: "custom",
          path: ["reviewEvents", index, "id"],
          message: "Duplicate review event",
        });
      }
      eventIds.add(row.id);
      checkOwnership(row.flashcardId, row.deckId, ["reviewEvents", index, "deckId"]);
      const stats = eventStats.get(row.flashcardId) ?? {
        again: 0,
        hard: 0,
        good: 0,
        easy: 0,
        first: row.reviewedAt,
        last: row.reviewedAt,
      };
      stats[row.rating] += 1;
      if (row.reviewedAt < stats.first) {
        stats.first = row.reviewedAt;
      }
      if (row.reviewedAt > stats.last) {
        stats.last = row.reviewedAt;
      }
      eventStats.set(row.flashcardId, stats);
      const deckLatest = latestDeckReview.get(row.deckId);
      if (!deckLatest || row.reviewedAt > deckLatest) {
        latestDeckReview.set(row.deckId, row.reviewedAt);
      }
      if (!studiedDeckIds.has(row.deckId)) {
        context.addIssue({
          code: "custom",
          path: ["reviewEvents", index, "deckId"],
          message: "Missing deck progress for review event",
        });
      }
    }
    for (const [index, row] of document.flashcardProgress.entries()) {
      const stats = eventStats.get(row.flashcardId);
      const eventCount = stats ? stats.again + stats.hard + stats.good + stats.easy : 0;
      if (row.reviewCount !== eventCount) {
        context.addIssue({
          code: "custom",
          path: ["flashcardProgress", index, "reviewCount"],
          message: "Summary and review events disagree",
        });
      }
      if (
        row.againCount !== (stats?.again ?? 0) ||
        row.hardCount !== (stats?.hard ?? 0) ||
        row.goodCount !== (stats?.good ?? 0) ||
        row.easyCount !== (stats?.easy ?? 0)
      ) {
        context.addIssue({
          code: "custom",
          path: ["flashcardProgress", index],
          message: "Rating totals and review events disagree",
        });
      }
      if (
        row.firstReviewedAt !== (stats?.first ?? null) ||
        row.lastReviewedAt !== (stats?.last ?? null)
      ) {
        context.addIssue({
          code: "custom",
          path: ["flashcardProgress", index],
          message: "Review dates and review events disagree",
        });
      }
    }
    for (const [flashcardId] of eventStats) {
      if (!progressIds.has(flashcardId)) {
        context.addIssue({
          code: "custom",
          path: ["reviewEvents"],
          message: `Missing progress summary for ${flashcardId}`,
        });
      }
    }
    for (const [index, row] of document.deckProgress.entries()) {
      if (row.lastReviewedAt !== latestDeckReview.get(row.deckId)) {
        context.addIssue({
          code: "custom",
          path: ["deckProgress", index, "lastReviewedAt"],
          message: "Deck review date and review events disagree",
        });
      }
    }
  });

export const ProgressBackupDocumentSchema = z.compile(ProgressBackupDocumentUncompiledSchema, {
  strict: true,
});

export type ProgressBackupDocument = z.infer<typeof ProgressBackupDocumentSchema>;

export type ProgressBackupSummary = Readonly<{
  deckCount: number;
  reviewCount: number;
  lastReviewedAt: string | null;
}>;

export function summarizeProgressBackup(document: ProgressBackupDocument): ProgressBackupSummary {
  return {
    deckCount: document.deckProgress.length,
    reviewCount: document.reviewEvents.length,
    lastReviewedAt: document.reviewEvents.reduce<string | null>(
      (latest, event) => (latest === null || event.reviewedAt > latest ? event.reviewedAt : latest),
      null
    ),
  };
}
