import { deckAppearanceSeedData, deckSeedData } from "@/features/decks/data/decks";

import { flashcardSeedData } from "@/features/flashcards/data/flashcards";
import type { DrizzleDatabase } from "@/infrastructure/sqlite/drizzle-database";
import { deckAppearances, decks, flashcards } from "@/infrastructure/sqlite/schema";

export async function seedDatabase<TRunResult>(
  database: DrizzleDatabase<TRunResult>
): Promise<void> {
  database.transaction((transaction) => {
    if (deckSeedData.length > 0) {
      transaction
        .insert(decks)
        .values(
          deckSeedData.map((deck) => ({
            createdAt: deck.createdAt,
            description: deck.description,
            id: deck.id,
            title: deck.title,
            updatedAt: deck.updatedAt,
          }))
        )
        .onConflictDoNothing()
        .run();
    }

    if (deckAppearanceSeedData.length > 0) {
      transaction
        .insert(deckAppearances)
        .values(
          deckAppearanceSeedData.map((appearance) => ({
            accentColor: appearance.accentColor,
            backgroundColor: appearance.backgroundColor,
            deckId: appearance.deckId,
          }))
        )
        .onConflictDoNothing()
        .run();
    }

    if (flashcardSeedData.length > 0) {
      transaction
        .insert(flashcards)
        .values(
          flashcardSeedData.map((flashcard) => ({
            answer: flashcard.answer,
            createdAt: flashcard.createdAt,
            deckId: flashcard.deckId,
            deckPosition: flashcard.deckPosition,
            id: flashcard.id,
            question: flashcard.question,
            updatedAt: flashcard.updatedAt,
          }))
        )
        .onConflictDoNothing()
        .run();
    }
  });
}
