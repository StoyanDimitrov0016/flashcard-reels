import { describe, expect, it } from "vitest";

import { orderReviewAttemptsForFinalization } from "@/features/study/application/review-attempt-finalization-order";
import { FlashcardReviewAttempt } from "@/features/study/domain/flashcard-review-attempt.model";

const CREATED_AT = "2026-01-01T00:00:00.000Z";

describe("review attempt finalization order", () => {
  it("orders rated attempts by rating time, reel position, and ID before skips", () => {
    const attempts = [
      attempt("late", 0, "good", "2026-01-01T00:03:00.000Z"),
      attempt("later-reel", 3, "easy", "2026-01-01T00:01:00.000Z"),
      attempt("earlier-reel", 1, "hard", "2026-01-01T00:01:00.000Z"),
      attempt("tie-b", 2, "again", "2026-01-01T00:01:00.000Z"),
      attempt("tie-a", 2, "again", "2026-01-01T00:01:00.000Z"),
      attempt("skip", 0, null, null),
    ];

    expect(orderReviewAttemptsForFinalization(attempts).map(({ id }) => id)).toEqual([
      "earlier-reel",
      "tie-a",
      "tie-b",
      "later-reel",
      "late",
      "skip",
    ]);
  });
});

function attempt(
  id: string,
  reelPosition: number,
  rating: "again" | "hard" | "good" | "easy" | null,
  ratedAt: string | null
): FlashcardReviewAttempt {
  return new FlashcardReviewAttempt({
    createdAt: CREATED_AT,
    finalizedAt: null,
    flashcardId: "card-1",
    id,
    ratedAt,
    rating,
    reelPosition,
    studySessionId: "session-1",
    updatedAt: CREATED_AT,
  });
}
