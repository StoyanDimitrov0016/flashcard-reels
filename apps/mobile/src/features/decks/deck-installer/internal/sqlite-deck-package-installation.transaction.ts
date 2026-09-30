import { and, eq, inArray, isNull, notInArray, or, sql } from "drizzle-orm";

import type {
  DeckPackage,
  DeckPackageInstallationTransaction,
} from "@/features/decks/deck-installer/internal/deck-package.model";
import type { DrizzleDatabase } from "@/infrastructure/sqlite/drizzle-database";
import type { IdGenerator } from "@/shared/domain/id-generator";

import {
  DeckPackageAuthorError,
  DeckPackageRevisionError,
  type DeckInstallResult,
} from "@/features/decks/deck-installer";
import {
  decks,
  deckThemeSelections,
  deckProgress,
  flashcardMemoryStates,
  flashcards,
  flashcardProgress,
  lessons,
  flashcardReviewEvents,
  dismissedBundledDecks,
  studySessions,
} from "@/infrastructure/sqlite/schema";

export class SQLiteDeckPackageInstallationTransaction<
  TRunResult = unknown,
> implements DeckPackageInstallationTransaction {
  private readonly database: DrizzleDatabase<TRunResult>;
  private readonly idGenerator: IdGenerator;

  constructor(database: DrizzleDatabase<TRunResult>, idGenerator: IdGenerator) {
    this.database = database;
    this.idGenerator = idGenerator;
  }

  async install(deckPackage: DeckPackage, now: string): Promise<DeckInstallResult> {
    const deck = deckPackage.deck;
    return this.database.transaction((transaction) => {
      const existingDeck = transaction
        .select()
        .from(decks)
        .where(eq(decks.id, deck.id))
        .limit(1)
        .all()[0];

      if (existingDeck && existingDeck.authorId !== deck.authorId) {
        throw new DeckPackageAuthorError(
          `Deck ${deck.id} cannot change author ID across revisions`
        );
      }
      if (existingDeck && existingDeck.revision === deck.revision) {
        return {
          deckId: deck.id,
          status: "no-op",
          revision: existingDeck.revision,
        };
      }
      if (existingDeck && existingDeck.revision > deck.revision) {
        throw new DeckPackageRevisionError(
          `Deck ${deck.id} revision ${deck.revision} is older than installed revision ${existingDeck.revision}`
        );
      }

      transaction
        .delete(dismissedBundledDecks)
        .where(eq(dismissedBundledDecks.deckId, deck.id))
        .run();
      const savedProgress = transaction
        .select()
        .from(deckProgress)
        .where(eq(deckProgress.deckId, deck.id))
        .limit(1)
        .all()[0];

      const incomingIds = deck.cards.map((card) => card.id);
      const cardsWithMatchingIds =
        incomingIds.length === 0
          ? []
          : transaction.select().from(flashcards).where(inArray(flashcards.id, incomingIds)).all();
      for (const card of cardsWithMatchingIds) {
        if (card.deckId !== deck.id) {
          throw new Error(`Flashcard ${card.id} already belongs to deck ${card.deckId}`);
        }
      }
      if (incomingIds.length > 0) {
        const progressOwners = transaction
          .select({ deckId: flashcardProgress.deckId, id: flashcardProgress.flashcardId })
          .from(flashcardProgress)
          .where(inArray(flashcardProgress.flashcardId, incomingIds))
          .all();
        const memoryOwners = transaction
          .select({ deckId: flashcardMemoryStates.deckId, id: flashcardMemoryStates.flashcardId })
          .from(flashcardMemoryStates)
          .where(inArray(flashcardMemoryStates.flashcardId, incomingIds))
          .all();
        const eventOwners = transaction
          .select({ deckId: flashcardReviewEvents.deckId, id: flashcardReviewEvents.flashcardId })
          .from(flashcardReviewEvents)
          .where(inArray(flashcardReviewEvents.flashcardId, incomingIds))
          .all();
        for (const card of [...progressOwners, ...memoryOwners, ...eventOwners]) {
          if (card.deckId !== deck.id) {
            throw new Error(`Flashcard ${card.id} already belongs to deck ${card.deckId}`);
          }
        }
      }

      if (!existingDeck) {
        transaction
          .insert(decks)
          .values({
            createdAt: deck.createdAt,
            description: deck.description,
            id: deck.id,
            authorId: deck.authorId,
            packageSchema: deck.schema,
            title: deck.title,
            updatedAt: deck.updatedAt,
            revision: deck.revision,
          })
          .run();
        transaction
          .insert(deckThemeSelections)
          .values({
            id: this.idGenerator.generate(),
            deckId: deck.id,
            theme: "graphite",
          })
          .onConflictDoNothing()
          .run();
      } else {
        transaction
          .update(decks)
          .set({
            description: deck.description,
            authorId: deck.authorId,
            packageSchema: deck.schema,
            title: deck.title,
            updatedAt: deck.updatedAt,
            revision: deck.revision,
          })
          .where(eq(decks.id, deck.id))
          .run();
      }

      const existingCards = transaction
        .select()
        .from(flashcards)
        .where(eq(flashcards.deckId, deck.id))
        .all();
      const existingCardsById = new Map(existingCards.map((card) => [card.id, card]));
      const maximumExistingOrder = existingCards.reduce(
        (maximum, card) => Math.max(maximum, card.order),
        -1
      );
      const offset = maximumExistingOrder + deck.cards.length + 1;
      if (existingCards.length > 0) {
        transaction
          .update(flashcards)
          .set({ order: sql`${flashcards.order} + ${offset}` })
          .where(eq(flashcards.deckId, deck.id))
          .run();
      }

      for (const [order, card] of deck.cards.entries()) {
        const existingCard = existingCardsById.get(card.id);
        if (existingCard) {
          transaction
            .update(flashcards)
            .set({
              active: true,
              answer: card.answer,
              lessonId: card.lessonId,
              lessonSectionId: card.lessonSectionId ?? null,
              order,
              question: card.question,
              updatedAt: card.updatedAt,
            })
            .where(eq(flashcards.id, card.id))
            .run();
        } else {
          transaction
            .insert(flashcards)
            .values({
              active: true,
              answer: card.answer,
              lessonId: card.lessonId,
              lessonSectionId: card.lessonSectionId ?? null,
              createdAt: card.createdAt,
              deckId: deck.id,
              id: card.id,
              order,
              question: card.question,
              updatedAt: card.updatedAt,
            })
            .run();
        }
      }

      if (incomingIds.length === 0) {
        transaction
          .update(flashcards)
          .set({ active: false })
          .where(eq(flashcards.deckId, deck.id))
          .run();
      } else {
        transaction
          .update(flashcards)
          .set({ active: false })
          .where(and(eq(flashcards.deckId, deck.id), notInArray(flashcards.id, incomingIds)))
          .run();
      }

      // Lessons are content with no learner state, so each revision replaces the previous set.
      const incomingLessonIds = deck.lessons.map((lesson) => lesson.id);
      const lessonOwners =
        incomingLessonIds.length === 0
          ? []
          : transaction
              .select({ deckId: lessons.deckId, id: lessons.id })
              .from(lessons)
              .where(inArray(lessons.id, incomingLessonIds))
              .all();
      for (const lesson of lessonOwners) {
        if (lesson.deckId !== deck.id) {
          throw new Error(`Lesson ${lesson.id} already belongs to deck ${lesson.deckId}`);
        }
      }
      transaction.delete(lessons).where(eq(lessons.deckId, deck.id)).run();
      for (const [order, lesson] of deck.lessons.entries()) {
        transaction
          .insert(lessons)
          .values({
            content: deckPackage.lessonFiles.get(lesson.id) ?? "",
            deckId: deck.id,
            id: lesson.id,
            order,
            title: lesson.title,
          })
          .run();
      }

      if (savedProgress?.status === "archived") {
        transaction
          .update(deckProgress)
          .set({ title: deck.title, revision: deck.revision, status: "pending" })
          .where(eq(deckProgress.deckId, deck.id))
          .run();
      } else if (savedProgress) {
        transaction
          .update(deckProgress)
          .set({ title: deck.title, revision: deck.revision })
          .where(eq(deckProgress.deckId, deck.id))
          .run();
      }

      const affectedSessions = transaction
        .select({ id: studySessions.id })
        .from(studySessions)
        .where(
          and(
            isNull(studySessions.completedAt),
            existingDeck
              ? or(
                  eq(studySessions.scope, "discover"),
                  and(eq(studySessions.scope, "focus"), eq(studySessions.deckId, deck.id))
                )
              : eq(studySessions.scope, "discover")
          )
        )
        .all();
      for (const session of affectedSessions) {
        transaction
          .update(studySessions)
          .set({ completedAt: now })
          .where(and(eq(studySessions.id, session.id), isNull(studySessions.completedAt)))
          .run();
      }

      return {
        deckId: deck.id,
        status: existingDeck ? "updated" : "installed",
        revision: deck.revision,
      };
    });
  }
}
