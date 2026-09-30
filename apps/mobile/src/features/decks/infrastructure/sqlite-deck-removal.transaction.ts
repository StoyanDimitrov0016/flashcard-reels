import { eq, inArray } from "drizzle-orm";

import type { DeckRemovalTransaction } from "@/features/decks/application/deck-removal.transaction";
import type { DeckId } from "@/features/decks/domain/deck.model";
import type { DrizzleDatabase } from "@/infrastructure/sqlite/drizzle-database";
import type { IdGenerator } from "@/shared/domain/id-generator";

import { SQLiteDeckLearnerData } from "@/features/decks/infrastructure/sqlite-deck-learner-data";
import bundledDeckRegistry from "@/infrastructure/bundled-deck-registry.json";
import {
  deckThemeSelections,
  decks,
  flashcardReviewAttempts,
  flashcards,
  lessons,
  dismissedBundledDecks,
  studySessionReels,
  studySessionRecurrences,
  studySessions,
} from "@/infrastructure/sqlite/schema";

export class SQLiteDeckRemovalTransaction<TRunResult = unknown> implements DeckRemovalTransaction {
  private readonly database: DrizzleDatabase<TRunResult>;
  private readonly idGenerator: IdGenerator;

  constructor(database: DrizzleDatabase<TRunResult>, idGenerator: IdGenerator) {
    this.database = database;
    this.idGenerator = idGenerator;
  }

  async remove(id: DeckId): Promise<void> {
    this.database.transaction((transaction) => {
      if (bundledDeckRegistry.some((deck) => deck.id === id)) {
        transaction
          .insert(dismissedBundledDecks)
          .values({ id: this.idGenerator.generate(), deckId: id })
          .onConflictDoNothing()
          .run();
      }
      new SQLiteDeckLearnerData(transaction).archive(id);
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
          .delete(studySessionReels)
          .where(inArray(studySessionReels.flashcardId, cardIds))
          .run();
      }
      transaction.delete(flashcards).where(eq(flashcards.deckId, id)).run();
      transaction.delete(lessons).where(eq(lessons.deckId, id)).run();
      transaction.delete(deckThemeSelections).where(eq(deckThemeSelections.deckId, id)).run();
      transaction.delete(decks).where(eq(decks.id, id)).run();
    });
  }
}
