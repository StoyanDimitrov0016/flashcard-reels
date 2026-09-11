import { and, eq, inArray, isNull, notInArray, or, sql } from "drizzle-orm";

import { DeckPackageVersionError, type DeckInstallResult } from "@/features/decks/deck-installer";
import type {
  DeckPackage,
  DeckPackageInstallationTransaction,
} from "@/features/decks/deck-installer/internal/deck-package.model";
import type { DrizzleDatabase } from "@/infrastructure/sqlite/drizzle-database";
import {
  decks,
  deckAppearances,
  flashcardReviewAttempts,
  flashcards,
  studySessions,
} from "@/infrastructure/sqlite/schema";

export class SQLiteDeckPackageInstallationTransaction<
  TRunResult = unknown,
> implements DeckPackageInstallationTransaction {
  private readonly database: DrizzleDatabase<TRunResult>;

  constructor(database: DrizzleDatabase<TRunResult>) {
    this.database = database;
  }

  async install(deckPackage: DeckPackage, now: string): Promise<DeckInstallResult> {
    return this.database.transaction((transaction) => {
      const existingDeck = transaction
        .select()
        .from(decks)
        .where(eq(decks.id, deckPackage.id))
        .limit(1)
        .all()[0];

      if (existingDeck && existingDeck.version === deckPackage.version) {
        return {
          deckId: deckPackage.id,
          status: "no-op",
          version: existingDeck.version,
        };
      }
      if (existingDeck && existingDeck.version > deckPackage.version) {
        throw new DeckPackageVersionError(
          `Deck ${deckPackage.id} version ${deckPackage.version} is older than installed version ${existingDeck.version}`
        );
      }

      const incomingIds = deckPackage.cards.map((card) => card.id);
      const cardsWithMatchingIds =
        incomingIds.length === 0
          ? []
          : transaction.select().from(flashcards).where(inArray(flashcards.id, incomingIds)).all();
      for (const card of cardsWithMatchingIds) {
        if (card.deckId !== deckPackage.id) {
          throw new Error(`Flashcard ${card.id} already belongs to deck ${card.deckId}`);
        }
      }

      if (!existingDeck) {
        transaction
          .insert(decks)
          .values({
            createdAt: deckPackage.createdAt,
            description: deckPackage.description,
            id: deckPackage.id,
            title: deckPackage.title,
            updatedAt: deckPackage.updatedAt,
            version: deckPackage.version,
          })
          .run();
        transaction
          .insert(deckAppearances)
          .values({
            deckId: deckPackage.id,
            presetId: "graphite",
          })
          .onConflictDoNothing()
          .run();
      } else {
        transaction
          .update(decks)
          .set({
            description: deckPackage.description,
            title: deckPackage.title,
            updatedAt: deckPackage.updatedAt,
            version: deckPackage.version,
          })
          .where(eq(decks.id, deckPackage.id))
          .run();
      }

      const existingCards = transaction
        .select()
        .from(flashcards)
        .where(eq(flashcards.deckId, deckPackage.id))
        .all();
      const existingCardsById = new Map(existingCards.map((card) => [card.id, card]));
      const maximumExistingOrder = existingCards.reduce(
        (maximum, card) => Math.max(maximum, card.order),
        -1
      );
      const offset = maximumExistingOrder + deckPackage.cards.length + 1;
      if (existingCards.length > 0) {
        transaction
          .update(flashcards)
          .set({ order: sql`${flashcards.order} + ${offset}` })
          .where(eq(flashcards.deckId, deckPackage.id))
          .run();
      }

      for (const card of deckPackage.cards) {
        const existingCard = existingCardsById.get(card.id);
        if (existingCard) {
          transaction
            .update(flashcards)
            .set({
              active: true,
              answer: card.answer,
              order: card.order,
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
              createdAt: card.createdAt,
              deckId: deckPackage.id,
              id: card.id,
              order: card.order,
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
          .where(eq(flashcards.deckId, deckPackage.id))
          .run();
      } else {
        transaction
          .update(flashcards)
          .set({ active: false })
          .where(and(eq(flashcards.deckId, deckPackage.id), notInArray(flashcards.id, incomingIds)))
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
                  eq(studySessions.scope, "mixed"),
                  and(eq(studySessions.scope, "focused"), eq(studySessions.deckId, deckPackage.id))
                )
              : eq(studySessions.scope, "mixed")
          )
        )
        .all();
      for (const session of affectedSessions) {
        transaction
          .update(flashcardReviewAttempts)
          .set({ finalizedAt: now, updatedAt: now })
          .where(
            and(
              eq(flashcardReviewAttempts.studySessionId, session.id),
              isNull(flashcardReviewAttempts.finalizedAt)
            )
          )
          .run();
        transaction
          .update(studySessions)
          .set({ completedAt: now })
          .where(and(eq(studySessions.id, session.id), isNull(studySessions.completedAt)))
          .run();
      }

      return {
        deckId: deckPackage.id,
        status: existingDeck ? "updated" : "installed",
        version: deckPackage.version,
      };
    });
  }
}
