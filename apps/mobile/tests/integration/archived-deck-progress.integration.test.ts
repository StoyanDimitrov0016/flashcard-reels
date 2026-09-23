import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";

import { SQLiteCardProgressAggregationTransaction } from "@/features/card-progress/infrastructure/sqlite-card-progress-aggregation-transaction";
import { SQLiteLearningProgressResetTransaction } from "@/features/card-progress/infrastructure/sqlite-learning-progress-reset-transaction";
import { DeckServiceImpl } from "@/features/decks/application/deck.service.impl";
import { SQLiteDeckPackageInstallationTransaction } from "@/features/decks/deck-installer/internal/sqlite-deck-package-installation.transaction";
import { SQLiteArchivedProgressQuery } from "@/features/decks/infrastructure/sqlite-archived-progress.query";
import { SQLiteDeckAppearanceRepository } from "@/features/decks/infrastructure/sqlite-deck-appearance.repository";
import { SQLiteDeckProgressRepository } from "@/features/decks/infrastructure/sqlite-deck-progress.repository";
import { SQLiteDeckRemovalTransaction } from "@/features/decks/infrastructure/sqlite-deck-removal.transaction";
import { SQLiteDeckRepository } from "@/features/decks/infrastructure/sqlite-deck.repository";
import { SQLiteSavedProgressDeletionTransaction } from "@/features/decks/infrastructure/sqlite-saved-progress-deletion.transaction";
import { SQLiteFlashcardRepository } from "@/features/flashcards/infrastructure/sqlite-flashcard.repository";
import { createLearningScheduler } from "@/features/learning-engine/application/learning-engine-factories";
import { SQLiteReviewAttemptFinalizationTransaction } from "@/features/study/infrastructure/sqlite-review-attempt-finalization-transaction";
import {
  deckProgress,
  flashcardMemoryStates,
  flashcardReviewAttempts,
  cardProgress,
  reviewEvents,
  studySessions,
} from "@/infrastructure/sqlite/schema";

import { NodeSqliteDatabase } from "../support/node-sqlite-database";
import { createScenarioGraph, seedDeck } from "../support/sqlite-study-scenario";
import {
  makeFlashcard,
  SequenceIdGenerator,
  TEST_DECK_ID,
  TestClock,
  testId,
} from "../support/study-fixtures";

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
    const aggregation = new SQLiteCardProgressAggregationTransaction(database.drizzle);
    await aggregation.aggregate(sessionId, 0, reviewedAt);
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
    await reviewedDeck();
    expect(await database.drizzle.select().from(reviewEvents)).toHaveLength(1);
    await new SQLiteDeckRemovalTransaction(database.drizzle).remove(TEST_DECK_ID);

    expect(await database.drizzle.select().from(reviewEvents)).toHaveLength(1);
    expect(await database.drizzle.select().from(cardProgress)).toHaveLength(1);
    expect(await database.drizzle.select().from(flashcardMemoryStates)).toHaveLength(1);
    expect(
      await new SQLiteArchivedProgressQuery(database.drizzle).listArchivedProgress()
    ).toMatchObject([
      {
        deckId: TEST_DECK_ID,
        reviewCount: 1,
        reviewedCardCount: 1,
      },
    ]);
    const archived = await new SQLiteArchivedProgressQuery(database.drizzle).listArchivedProgress();
    expect(archived[0]?.estimatedBytes).toBeGreaterThan(0);

    const installer = new SQLiteDeckPackageInstallationTransaction(database.drizzle);
    await installer.install(packageForReinstall(), reviewedAt);
    expect(await new SQLiteDeckProgressRepository(database.drizzle).listPending()).toHaveLength(1);
    const cards = new SQLiteFlashcardRepository(database.drizzle);
    expect(await cards.list()).toEqual([]);
    expect(await cards.listByDeckId(TEST_DECK_ID)).toEqual([]);

    await new SQLiteDeckProgressRepository(database.drizzle).continueProgress(TEST_DECK_ID);
    expect(await cards.listByDeckId(TEST_DECK_ID)).toHaveLength(1);
    expect(await new SQLiteArchivedProgressQuery(database.drizzle).listArchivedProgress()).toEqual(
      []
    );
    expect(await database.drizzle.select().from(flashcardMemoryStates)).toHaveLength(1);
  });

  it("finishes interrupted progress aggregation before removing deck content", async () => {
    database = new NodeSqliteDatabase();
    await seedDeck(database, TEST_DECK_ID, [cardId]);
    const sessionId = testId(710);
    const reviewCount = 51;
    await database.drizzle.insert(studySessions).values({
      id: sessionId,
      scope: "mixed",
      deckId: null,
      currentReelPosition: reviewCount - 1,
      furthestReelPosition: reviewCount - 1,
      createdAt: reviewedAt,
      completedAt: reviewedAt,
      lastActiveAt: reviewedAt,
      feedState: "{}",
    });
    const finalization = new SQLiteReviewAttemptFinalizationTransaction(
      database.drizzle,
      createLearningScheduler()
    );
    for (let position = 0; position < reviewCount; position += 1) {
      const attemptId = testId(720 + position);
      const ratedAt = new Date(Date.parse(reviewedAt) + position * 1000).toISOString();
      // oxlint-disable-next-line no-await-in-loop -- Each review updates the card's FSRS state.
      await database.drizzle.insert(flashcardReviewAttempts).values({
        id: attemptId,
        studySessionId: sessionId,
        flashcardId: cardId,
        reelPosition: position,
        rating: "good",
        ratedAt,
        createdAt: ratedAt,
        updatedAt: ratedAt,
      });
      // oxlint-disable-next-line no-await-in-loop -- FSRS transitions must be finalized in order.
      expect(await finalization.finalizeAttempt(attemptId, ratedAt, ratedAt)).toBe(true);
    }

    const repository = new SQLiteDeckRepository(database.drizzle);
    const graph = createScenarioGraph(database, new TestClock(), new SequenceIdGenerator());
    const service = new DeckServiceImpl(
      repository,
      new SQLiteDeckAppearanceRepository(database.drizzle),
      new SQLiteDeckRemovalTransaction(database.drizzle),
      null,
      graph.study
    );
    await service.remove(TEST_DECK_ID);

    expect(await database.drizzle.select().from(reviewEvents)).toHaveLength(reviewCount);
    expect(await database.drizzle.select().from(cardProgress)).toMatchObject([{ reviewCount }]);
    expect(
      await new SQLiteArchivedProgressQuery(database.drizzle).listArchivedProgress()
    ).toMatchObject([{ reviewCount }]);
  });

  it("permanently deletes saved progress when starting a reinstalled deck fresh", async () => {
    await reviewedDeck();
    await new SQLiteDeckRemovalTransaction(database.drizzle).remove(TEST_DECK_ID);
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
    await new SQLiteSavedProgressDeletionTransaction(database.drizzle).deleteProgress(TEST_DECK_ID);

    expect(await database.drizzle.select().from(reviewEvents)).toEqual([]);
    expect(await database.drizzle.select().from(cardProgress)).toEqual([]);
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
    await reviewedDeck();
    await new SQLiteDeckRemovalTransaction(database.drizzle).remove(TEST_DECK_ID);
    await new SQLiteSavedProgressDeletionTransaction(database.drizzle).deleteProgress(TEST_DECK_ID);

    expect(await new SQLiteArchivedProgressQuery(database.drizzle).listArchivedProgress()).toEqual(
      []
    );
    expect(await database.drizzle.select().from(reviewEvents)).toEqual([]);
    expect(await database.drizzle.select().from(cardProgress)).toEqual([]);
    expect(await database.drizzle.select().from(flashcardMemoryStates)).toEqual([]);
  });

  it("includes uninstalled deck progress in Reset all learning progress", async () => {
    await reviewedDeck();
    await new SQLiteDeckRemovalTransaction(database.drizzle).remove(TEST_DECK_ID);
    await new SQLiteLearningProgressResetTransaction(database.drizzle).resetAll(reviewedAt);

    expect(await new SQLiteArchivedProgressQuery(database.drizzle).listArchivedProgress()).toEqual(
      []
    );
    expect(await database.drizzle.select().from(reviewEvents)).toEqual([]);
    expect(await database.drizzle.select().from(cardProgress)).toEqual([]);
    expect(await database.drizzle.select().from(flashcardMemoryStates)).toEqual([]);
  });

  it("clears durable review history when resetting one card", async () => {
    await reviewedDeck();
    await new SQLiteLearningProgressResetTransaction(database.drizzle).resetCard(
      cardId,
      reviewedAt
    );

    expect(await database.drizzle.select().from(reviewEvents)).toEqual([]);
    expect(await database.drizzle.select().from(deckProgress)).toEqual([]);
    await new SQLiteDeckRemovalTransaction(database.drizzle).remove(TEST_DECK_ID);
    expect(await new SQLiteArchivedProgressQuery(database.drizzle).listArchivedProgress()).toEqual(
      []
    );
  });

  it("clears durable review history when resetting one deck", async () => {
    await reviewedDeck();
    await new SQLiteLearningProgressResetTransaction(database.drizzle).resetDeck(
      TEST_DECK_ID,
      reviewedAt
    );

    expect(await database.drizzle.select().from(reviewEvents)).toEqual([]);
    expect(await database.drizzle.select().from(deckProgress)).toEqual([]);
    await new SQLiteDeckRemovalTransaction(database.drizzle).remove(TEST_DECK_ID);
    expect(await new SQLiteArchivedProgressQuery(database.drizzle).listArchivedProgress()).toEqual(
      []
    );
  });

  it("clears saved progress for cards absent from the reinstalled deck on deck reset", async () => {
    await reviewedDeck();
    await new SQLiteDeckRemovalTransaction(database.drizzle).remove(TEST_DECK_ID);
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
    await new SQLiteDeckProgressRepository(database.drizzle).continueProgress(TEST_DECK_ID);

    await new SQLiteLearningProgressResetTransaction(database.drizzle).resetDeck(
      TEST_DECK_ID,
      reviewedAt
    );

    expect(
      await database.drizzle.select().from(cardProgress).where(eq(cardProgress.flashcardId, cardId))
    ).toEqual([]);
    expect(await database.drizzle.select().from(flashcardMemoryStates)).toEqual([]);
    expect(await database.drizzle.select().from(reviewEvents)).toEqual([]);
    await new SQLiteDeckRemovalTransaction(database.drizzle).remove(TEST_DECK_ID);
    expect(await new SQLiteArchivedProgressQuery(database.drizzle).listArchivedProgress()).toEqual(
      []
    );
  });

  it("does not archive an unstudied deck", async () => {
    database = new NodeSqliteDatabase();
    await seedDeck(database, TEST_DECK_ID, [cardId]);
    await new SQLiteDeckRemovalTransaction(database.drizzle).remove(TEST_DECK_ID);
    expect(await new SQLiteArchivedProgressQuery(database.drizzle).listArchivedProgress()).toEqual(
      []
    );
    expect(
      await database.drizzle
        .select()
        .from(deckProgress)
        .where(eq(deckProgress.deckId, TEST_DECK_ID))
    ).toEqual([]);
  });
});
