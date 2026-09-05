import { deckAppearanceSeedData, deckSeedData } from "@/features/decks/data/decks";
import { flashcardSeedData } from "@/features/flashcards/data/flashcards";
import type { SQLiteDatabaseLike } from "@/infrastructure/sqlite/sqlite-database";

export async function seedDatabase(database: SQLiteDatabaseLike): Promise<void> {
  await database.withTransactionAsync(async () => {
    for (const deck of deckSeedData) {
      // oxlint-disable-next-line no-await-in-loop -- Keep writes serialized on the transaction connection.
      await database.runAsync(
        "INSERT OR IGNORE INTO decks (id, title, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
        deck.id,
        deck.title,
        deck.description,
        deck.createdAt,
        deck.updatedAt
      );
    }

    for (const appearance of deckAppearanceSeedData) {
      // oxlint-disable-next-line no-await-in-loop -- Keep writes serialized on the transaction connection.
      await database.runAsync(
        "INSERT OR IGNORE INTO deck_appearances (deck_id, accent_color, background_color) VALUES (?, ?, ?)",
        appearance.deckId,
        appearance.accentColor,
        appearance.backgroundColor
      );
    }

    for (const flashcard of flashcardSeedData) {
      // oxlint-disable-next-line no-await-in-loop -- Keep writes serialized on the transaction connection.
      await database.runAsync(
        "INSERT OR IGNORE INTO flashcards (id, deck_id, question, answer, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
        flashcard.id,
        flashcard.deckId,
        flashcard.question,
        flashcard.answer,
        flashcard.createdAt,
        flashcard.updatedAt
      );
    }
  });
}
