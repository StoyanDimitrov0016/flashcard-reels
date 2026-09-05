import type { SQLiteDatabase } from "expo-sqlite";

import { deckAppearanceSeedData, deckSeedData } from "@/features/decks/data/decks";
import { flashcardSeedData } from "@/features/flashcards/data/flashcards";

export async function seedDatabase(database: SQLiteDatabase): Promise<void> {
  await database.withTransactionAsync(async () => {
    await Promise.all(
      deckSeedData.map((deck) =>
        database.runAsync(
          "INSERT OR IGNORE INTO decks (id, title, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
          deck.id,
          deck.title,
          deck.description,
          deck.createdAt,
          deck.updatedAt
        )
      )
    );

    await Promise.all(
      deckAppearanceSeedData.map((appearance) =>
        database.runAsync(
          "INSERT OR IGNORE INTO deck_appearances (deck_id, accent_color, background_color) VALUES (?, ?, ?)",
          appearance.deckId,
          appearance.accentColor,
          appearance.backgroundColor
        )
      )
    );

    await Promise.all(
      flashcardSeedData.map((flashcard) =>
        database.runAsync(
          "INSERT OR IGNORE INTO flashcards (id, deck_id, question, answer, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
          flashcard.id,
          flashcard.deckId,
          flashcard.question,
          flashcard.answer,
          flashcard.createdAt,
          flashcard.updatedAt
        )
      )
    );
  });
}
