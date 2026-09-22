import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";

import { SQLiteDeckPackageInstallationTransaction } from "@/features/decks/deck-installer/internal/sqlite-deck-package-installation.transaction";
import { SQLiteDeckRepository } from "@/features/decks/infrastructure/sqlite-deck.repository";
import { SQLiteFlashcardRepository } from "@/features/flashcards/infrastructure/sqlite-flashcard.repository";
import { SQLiteLearnerProfileAggregationTransaction } from "@/features/learner-profile/infrastructure/sqlite-learner-profile-aggregation-transaction";
import { SQLiteLearningProgressResetTransaction } from "@/features/learner-profile/infrastructure/sqlite-learning-progress-reset-transaction";
import { createLearningScheduler } from "@/features/learning-engine/application/learning-engine-factories";
import { SQLiteReviewAttemptFinalizationTransaction } from "@/features/study/infrastructure/sqlite-review-attempt-finalization-transaction";
import {
  deckProgress,
  flashcardMemoryStates,
  flashcardReviewAttempts,
  learnerProfiles,
  reviewEvents,
  studySessions,
} from "@/infrastructure/sqlite/schema";

import { NodeSqliteDatabase } from "../support/node-sqlite-database";
import { seedDeck } from "../support/sqlite-study-scenario";
import { makeFlashcard, TEST_DECK_ID, testId } from "../support/study-fixtures";

const reviewedAt = "2026-01-02T00:00:00.000Z";
const cardId = makeFlashcard(1).id;

describe("archived deck progress", () => {
  let database: NodeSqliteDatabase;

  afterEach(() => database?.close());

  async function reviewedDeck() {
    database = new NodeSqliteDatabase();
    await seedDeck(database, TEST_DECK_ID, [cardId]);
    const sessionId = testId(700);
    const attemptId = testId(701);
    await database.drizzle.insert(studySessions).values({
      id: sessionId,
      scope: "focused",
      deckId: TEST_DECK_ID,
      currentReelPosition: 1,
      furthestReelPosition: 1,
      createdAt: reviewedAt,
      lastActiveAt: reviewedAt,
      feedState: "{}",
    });
    await database.drizzle.insert(flashcardReviewAttempts).values({
      id: attemptId,
      studySessionId: sessionId,
      flashcardId: cardId,
      reelPosition: 0,
      rating: "good",
      ratedAt: reviewedAt,
      createdAt: reviewedAt,
      updatedAt: reviewedAt,
    });
    const finalization = new SQLiteReviewAttemptFinalizationTransaction(
      database.drizzle,
      createLearningScheduler()
    );
    expect(await finalization.finalizeAttempt(attemptId, reviewedAt, reviewedAt)).toBe(true);
    const aggregation = new SQLiteLearnerProfileAggregationTransaction(database.drizzle);
    await aggregation.aggregate(sessionId, 0, reviewedAt);
    return new SQLiteDeckRepository(database.drizzle);
  }

  function packageForReinstall() {
    return {
      id: TEST_DECK_ID,
      title: "Reinstalled deck",
      description: "",
      version: 2,
      createdAt: reviewedAt,
      updatedAt: reviewedAt,
      cards: [
        {
          id: cardId,
          order: 0,
          question: "Question",
          answer: "Answer",
          createdAt: reviewedAt,
          updatedAt: reviewedAt,
        },
      ],
      audioFiles: new Map<string, Uint8Array>(),
    };
  }

  it("retains events and FSRS state after removing content, then pauses a reinstall until continued", async () => {
    const repository = await reviewedDeck();
    expect(await database.drizzle.select().from(reviewEvents)).toHaveLength(1);
    await repository.remove(TEST_DECK_ID);

    expect(await database.drizzle.select().from(reviewEvents)).toHaveLength(1);
    expect(await database.drizzle.select().from(learnerProfiles)).toHaveLength(1);
    expect(await database.drizzle.select().from(flashcardMemoryStates)).toHaveLength(1);
    expect(await repository.listArchivedProgress()).toMatchObject([
      {
        deckId: TEST_DECK_ID,
        reviewCount: 1,
        reviewedCardCount: 1,
      },
    ]);
    const archived = await repository.listArchivedProgress();
    expect(archived[0]?.estimatedBytes).toBeGreaterThan(0);

    const installer = new SQLiteDeckPackageInstallationTransaction(database.drizzle);
    await installer.install(packageForReinstall(), reviewedAt);
    expect(await repository.listPendingProgress()).toHaveLength(1);
    const cards = new SQLiteFlashcardRepository(database.drizzle);
    expect(await cards.list()).toEqual([]);
    expect(await cards.listByDeckId(TEST_DECK_ID)).toEqual([]);

    await repository.continueProgress(TEST_DECK_ID);
    expect(await cards.listByDeckId(TEST_DECK_ID)).toHaveLength(1);
    expect(await repository.listArchivedProgress()).toEqual([]);
    expect(await database.drizzle.select().from(flashcardMemoryStates)).toHaveLength(1);
  });

  it("permanently deletes saved progress when starting a reinstalled deck fresh", async () => {
    const repository = await reviewedDeck();
    await repository.remove(TEST_DECK_ID);
    await new SQLiteDeckPackageInstallationTransaction(database.drizzle).install(
      packageForReinstall(),
      reviewedAt
    );
    const unrelatedSessionId = testId(702);
    await database.drizzle.insert(studySessions).values({
      id: unrelatedSessionId,
      scope: "mixed",
      deckId: null,
      currentReelPosition: 0,
      furthestReelPosition: 0,
      createdAt: reviewedAt,
      lastActiveAt: reviewedAt,
      feedState: "{}",
    });
    await repository.deleteProgress(TEST_DECK_ID);

    expect(await database.drizzle.select().from(reviewEvents)).toEqual([]);
    expect(await database.drizzle.select().from(learnerProfiles)).toEqual([]);
    expect(await database.drizzle.select().from(flashcardMemoryStates)).toEqual([]);
    expect(await database.drizzle.select().from(deckProgress)).toEqual([]);
    expect(
      await database.drizzle
        .select()
        .from(studySessions)
        .where(eq(studySessions.id, unrelatedSessionId))
    ).toHaveLength(1);
    expect(
      await new SQLiteFlashcardRepository(database.drizzle).listByDeckId(TEST_DECK_ID)
    ).toHaveLength(1);
  });

  it("lets the user delete an archive without reinstalling the deck", async () => {
    const repository = await reviewedDeck();
    await repository.remove(TEST_DECK_ID);
    await repository.deleteProgress(TEST_DECK_ID);

    expect(await repository.listArchivedProgress()).toEqual([]);
    expect(await database.drizzle.select().from(reviewEvents)).toEqual([]);
    expect(await database.drizzle.select().from(learnerProfiles)).toEqual([]);
    expect(await database.drizzle.select().from(flashcardMemoryStates)).toEqual([]);
  });

  it("includes uninstalled deck progress in Reset all learning progress", async () => {
    const repository = await reviewedDeck();
    await repository.remove(TEST_DECK_ID);
    await new SQLiteLearningProgressResetTransaction(database.drizzle).resetAll(reviewedAt);

    expect(await repository.listArchivedProgress()).toEqual([]);
    expect(await database.drizzle.select().from(reviewEvents)).toEqual([]);
    expect(await database.drizzle.select().from(learnerProfiles)).toEqual([]);
    expect(await database.drizzle.select().from(flashcardMemoryStates)).toEqual([]);
  });

  it("clears durable review history when resetting one card", async () => {
    const repository = await reviewedDeck();
    await new SQLiteLearningProgressResetTransaction(database.drizzle).resetCard(
      cardId,
      reviewedAt
    );

    expect(await database.drizzle.select().from(reviewEvents)).toEqual([]);
    expect(await database.drizzle.select().from(deckProgress)).toEqual([]);
    await repository.remove(TEST_DECK_ID);
    expect(await repository.listArchivedProgress()).toEqual([]);
  });

  it("clears durable review history when resetting one deck", async () => {
    const repository = await reviewedDeck();
    await new SQLiteLearningProgressResetTransaction(database.drizzle).resetDeck(
      TEST_DECK_ID,
      reviewedAt
    );

    expect(await database.drizzle.select().from(reviewEvents)).toEqual([]);
    expect(await database.drizzle.select().from(deckProgress)).toEqual([]);
    await repository.remove(TEST_DECK_ID);
    expect(await repository.listArchivedProgress()).toEqual([]);
  });

  it("clears saved progress for cards absent from the reinstalled deck on deck reset", async () => {
    const repository = await reviewedDeck();
    await repository.remove(TEST_DECK_ID);
    const replacement = packageForReinstall();
    await new SQLiteDeckPackageInstallationTransaction(database.drizzle).install(
      {
        ...replacement,
        cards: [
          {
            id: testId(705),
            order: 0,
            question: "Replacement question",
            answer: "Replacement answer",
            createdAt: reviewedAt,
            updatedAt: reviewedAt,
          },
        ],
      },
      reviewedAt
    );
    await repository.continueProgress(TEST_DECK_ID);

    await new SQLiteLearningProgressResetTransaction(database.drizzle).resetDeck(
      TEST_DECK_ID,
      reviewedAt
    );

    expect(
      await database.drizzle
        .select()
        .from(learnerProfiles)
        .where(eq(learnerProfiles.flashcardId, cardId))
    ).toEqual([]);
    expect(await database.drizzle.select().from(flashcardMemoryStates)).toEqual([]);
    expect(await database.drizzle.select().from(reviewEvents)).toEqual([]);
    await repository.remove(TEST_DECK_ID);
    expect(await repository.listArchivedProgress()).toEqual([]);
  });

  it("does not archive an unstudied deck", async () => {
    database = new NodeSqliteDatabase();
    await seedDeck(database, TEST_DECK_ID, [cardId]);
    const repository = new SQLiteDeckRepository(database.drizzle);
    await repository.remove(TEST_DECK_ID);
    expect(await repository.listArchivedProgress()).toEqual([]);
    expect(
      await database.drizzle
        .select()
        .from(deckProgress)
        .where(eq(deckProgress.deckId, TEST_DECK_ID))
    ).toEqual([]);
  });
});
