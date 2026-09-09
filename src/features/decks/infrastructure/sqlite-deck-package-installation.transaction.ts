import { and, eq, inArray, isNull, notInArray, or, sql } from "drizzle-orm";

import type {
  DeckPackage,
  DeckPackageInstallationTransaction,
  DeckPackageInstallResult,
} from "@/features/decks/domain/deck-package.model";
import type { DrizzleDatabase } from "@/infrastructure/sqlite/drizzle-database";
import {
  decks,
  deckAppearances,
  flashcardReviewAttempts,
  flashcards,
  learnerProfiles,
  studySessions,
} from "@/infrastructure/sqlite/schema";

export class DeckPackageVersionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DeckPackageVersionError";
  }
}

export class SQLiteDeckPackageInstallationTransaction<
  TRunResult = unknown,
> implements DeckPackageInstallationTransaction {
  private readonly database: DrizzleDatabase<TRunResult>;

  constructor(database: DrizzleDatabase<TRunResult>) {
    this.database = database;
  }

  async install(deckPackage: DeckPackage, now: string): Promise<DeckPackageInstallResult> {
    return this.database.transaction((transaction) => {
      const existingDeck = transaction
        .select()
        .from(decks)
        .where(eq(decks.id, deckPackage.manifest.id))
        .limit(1)
        .all()[0];

      if (existingDeck && existingDeck.version === deckPackage.manifest.version) {
        return {
          deckId: deckPackage.manifest.id,
          status: "no-op",
          version: existingDeck.version,
        };
      }
      if (existingDeck && existingDeck.version > deckPackage.manifest.version) {
        throw new DeckPackageVersionError(
          `Deck ${deckPackage.manifest.id} version ${deckPackage.manifest.version} is older than installed version ${existingDeck.version}`
        );
      }

      const incomingIds = deckPackage.cards.map((card) => card.id);
      const cardsWithMatchingIds =
        incomingIds.length === 0
          ? []
          : transaction.select().from(flashcards).where(inArray(flashcards.id, incomingIds)).all();
      for (const card of cardsWithMatchingIds) {
        if (card.deckId !== deckPackage.manifest.id) {
          throw new Error(`Flashcard ${card.id} already belongs to deck ${card.deckId}`);
        }
      }

      if (!existingDeck) {
        transaction
          .insert(decks)
          .values({
            createdAt: deckPackage.manifest.createdAt,
            description: deckPackage.manifest.description,
            id: deckPackage.manifest.id,
            title: deckPackage.manifest.title,
            updatedAt: deckPackage.manifest.updatedAt,
            version: deckPackage.manifest.version,
          })
          .run();
        transaction
          .insert(deckAppearances)
          .values({
            accentColor: "#4FD1C5",
            backgroundColor: "#0B151A",
            deckId: deckPackage.manifest.id,
          })
          .onConflictDoNothing()
          .run();
      } else {
        transaction
          .update(decks)
          .set({
            description: deckPackage.manifest.description,
            title: deckPackage.manifest.title,
            updatedAt: deckPackage.manifest.updatedAt,
            version: deckPackage.manifest.version,
          })
          .where(eq(decks.id, deckPackage.manifest.id))
          .run();
      }

      const existingCards = transaction
        .select()
        .from(flashcards)
        .where(eq(flashcards.deckId, deckPackage.manifest.id))
        .all();
      const offset = existingCards.length + deckPackage.cards.length + 1;
      if (existingCards.length > 0) {
        transaction
          .update(flashcards)
          .set({ position: sql`${flashcards.position} + ${offset}` })
          .where(eq(flashcards.deckId, deckPackage.manifest.id))
          .run();
      }

      for (const card of deckPackage.cards) {
        const existingCard = existingCards.find((candidate) => candidate.id === card.id);
        if (existingCard) {
          transaction
            .update(flashcards)
            .set({
              active: true,
              answer: card.answer,
              position: card.position,
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
              deckId: card.deckId,
              id: card.id,
              position: card.position,
              question: card.question,
              updatedAt: card.updatedAt,
            })
            .run();
          transaction
            .insert(learnerProfiles)
            .values({
              createdAt: card.createdAt,
              flashcardId: card.id,
              updatedAt: card.updatedAt,
            })
            .onConflictDoNothing()
            .run();
        }
      }

      if (incomingIds.length === 0) {
        transaction
          .update(flashcards)
          .set({ active: false })
          .where(eq(flashcards.deckId, deckPackage.manifest.id))
          .run();
      } else {
        transaction
          .update(flashcards)
          .set({ active: false })
          .where(
            and(
              eq(flashcards.deckId, deckPackage.manifest.id),
              notInArray(flashcards.id, incomingIds)
            )
          )
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
                  and(
                    eq(studySessions.scope, "focused"),
                    eq(studySessions.deckId, deckPackage.manifest.id)
                  )
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
        deckId: deckPackage.manifest.id,
        status: existingDeck ? "updated" : "installed",
        version: deckPackage.manifest.version,
      };
    });
  }
}
