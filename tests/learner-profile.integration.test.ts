import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { SQLiteLearnerProfileRepository } from "@/features/learner-profile/infrastructure/sqlite-learner-profile.repository";
import { NodeSqliteDatabase } from "./support/node-sqlite-database";
import { OTHER_DECK_ID, TEST_DECK_ID, makeFlashcard } from "./support/study-test-support";

describe("SQLite learner profiles", () => {
  let database: NodeSqliteDatabase;
  let profiles: SQLiteLearnerProfileRepository;

  beforeEach(async () => {
    database = new NodeSqliteDatabase();
    await insertDeck(TEST_DECK_ID, "Test deck");
    await insertDeck(OTHER_DECK_ID, "Other deck");
    await insertFlashcard(makeFlashcard(1, TEST_DECK_ID));
    await insertFlashcard(makeFlashcard(2, TEST_DECK_ID));
    await insertFlashcard(makeFlashcard(3, OTHER_DECK_ID));
    profiles = new SQLiteLearnerProfileRepository(database.drizzle);
  });

  afterEach(() => {
    database.close();
  });

  it("reads existing profiles for a candidate set in one batched repository operation", async () => {
    await profiles.resetCard(makeFlashcard(1).id, "2026-01-02T00:00:00.000Z");
    await profiles.resetCard(makeFlashcard(3, OTHER_DECK_ID).id, "2026-01-03T00:00:00.000Z");

    const result = await profiles.findByFlashcardIds([
      makeFlashcard(1).id,
      makeFlashcard(2).id,
      makeFlashcard(3, OTHER_DECK_ID).id,
    ]);

    expect([...result.keys()]).toEqual([makeFlashcard(1).id, makeFlashcard(3, OTHER_DECK_ID).id]);
    expect(result.get(makeFlashcard(1).id)).toMatchObject({
      againCount: 0,
      flashcardId: makeFlashcard(1).id,
      resetAt: "2026-01-02T00:00:00.000Z",
      reviewCount: 0,
    });
    expect(await profiles.findByFlashcardId(makeFlashcard(2).id)).toBeNull();
  });

  it("resets one card, one deck, and all cards without deleting content", async () => {
    await profiles.resetCard(makeFlashcard(1).id, "2026-01-02T00:00:00.000Z");
    await database.runAsync(
      "UPDATE learner_profiles SET again_count = 1, review_count = 1, last_reviewed_at = ?, updated_at = ? WHERE flashcard_id = ?",
      "2026-01-01T00:00:00.000Z",
      "2026-01-01T00:00:00.000Z",
      makeFlashcard(1).id
    );

    await profiles.resetDeck(TEST_DECK_ID, "2026-01-03T00:00:00.000Z");
    expect(await profiles.findByFlashcardId(makeFlashcard(1).id)).toMatchObject({
      resetAt: "2026-01-03T00:00:00.000Z",
      reviewCount: 0,
    });
    expect(await profiles.findByFlashcardId(makeFlashcard(2).id)).toMatchObject({
      resetAt: "2026-01-03T00:00:00.000Z",
      reviewCount: 0,
    });
    expect(await profiles.findByFlashcardId(makeFlashcard(3, OTHER_DECK_ID).id)).toBeNull();

    await profiles.resetAll("2026-01-04T00:00:00.000Z");
    expect(
      [
        ...(
          await profiles.findByFlashcardIds([
            makeFlashcard(1).id,
            makeFlashcard(2).id,
            makeFlashcard(3, OTHER_DECK_ID).id,
          ])
        ).values(),
      ].map((profile) => profile.resetAt)
    ).toEqual(["2026-01-04T00:00:00.000Z", "2026-01-04T00:00:00.000Z", "2026-01-04T00:00:00.000Z"]);
    expect(
      await database.getFirstAsync("SELECT id FROM flashcards WHERE id = ?", makeFlashcard(1).id)
    ).toEqual({
      id: makeFlashcard(1).id,
    });
  });

  it("cascades a profile when its flashcard is deleted", async () => {
    await profiles.resetCard(makeFlashcard(1).id, "2026-01-02T00:00:00.000Z");
    await database.runAsync("DELETE FROM flashcards WHERE id = ?", makeFlashcard(1).id);

    expect(await profiles.findByFlashcardId(makeFlashcard(1).id)).toBeNull();
  });

  async function insertDeck(id: string, title: string): Promise<void> {
    await database.runAsync(
      "INSERT INTO decks (id, title, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
      id,
      title,
      title,
      "2026-01-01T00:00:00.000Z",
      "2026-01-01T00:00:00.000Z"
    );
  }

  async function insertFlashcard(card: ReturnType<typeof makeFlashcard>): Promise<void> {
    await database.runAsync(
      "INSERT INTO flashcards (id, deck_id, deck_position, question, answer, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      card.id,
      card.deckId,
      card.deckPosition,
      card.question,
      card.answer,
      card.createdAt,
      card.updatedAt
    );
  }
});
