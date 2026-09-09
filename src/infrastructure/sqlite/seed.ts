import {
  deckAppearanceSeedData,
  deckSeedData,
} from "@/features/decks/infrastructure/seed-data/decks";

import { flashcardSeedData } from "@/features/flashcards/infrastructure/seed-data/flashcards";
import { sql } from "drizzle-orm";
import type { DrizzleDatabase } from "@/infrastructure/sqlite/drizzle-database";
import {
  deckAppearances,
  decks,
  flashcards,
  learnerProfiles,
} from "@/infrastructure/sqlite/schema";

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
            coverAsset: deck.coverAsset,
            title: deck.title,
            updatedAt: deck.updatedAt,
            version: deck.version,
          }))
        )
        .onConflictDoUpdate({
          target: decks.id,
          set: {
            coverAsset: sql`excluded.cover_asset`,
            description: sql`excluded.description`,
            title: sql`excluded.title`,
            updatedAt: sql`excluded.updated_at`,
            version: sql`excluded.version`,
          },
        })
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
            position: flashcard.position,
            active: flashcard.active,
            id: flashcard.id,
            question: flashcard.question,
            updatedAt: flashcard.updatedAt,
          }))
        )
        .onConflictDoNothing()
        .run();
      transaction
        .insert(learnerProfiles)
        .values(
          flashcardSeedData.map((flashcard) => ({
            createdAt: flashcard.createdAt,
            flashcardId: flashcard.id,
            updatedAt: flashcard.updatedAt,
          }))
        )
        .onConflictDoNothing()
        .run();
    }
  });
}
