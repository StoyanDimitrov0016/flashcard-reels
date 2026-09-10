import type { FlashcardReviewAttempt } from "@/features/study/domain/flashcard-review-attempt.model";

export function orderReviewAttemptsForFinalization(
  attempts: readonly FlashcardReviewAttempt[]
): FlashcardReviewAttempt[] {
  const ratedAttempts = attempts.filter(isRatedReviewAttempt).reduce(insertRatedAttempt, []);
  const unratedAttempts = attempts.filter((attempt) => !isRatedReviewAttempt(attempt));
  return [...ratedAttempts, ...unratedAttempts];
}

export function isRatedReviewAttempt(attempt: FlashcardReviewAttempt): boolean {
  return attempt.rating !== null && attempt.ratedAt !== null;
}

function insertRatedAttempt(
  orderedAttempts: FlashcardReviewAttempt[],
  attempt: FlashcardReviewAttempt
): FlashcardReviewAttempt[] {
  const insertionIndex = orderedAttempts.findIndex(
    (current) => compareRatedAttempts(attempt, current) < 0
  );
  if (insertionIndex < 0) {
    return [...orderedAttempts, attempt];
  }
  return [
    ...orderedAttempts.slice(0, insertionIndex),
    attempt,
    ...orderedAttempts.slice(insertionIndex),
  ];
}

export function compareRatedAttempts(
  left: FlashcardReviewAttempt,
  right: FlashcardReviewAttempt
): number {
  const leftRatedAt = left.ratedAt;
  const rightRatedAt = right.ratedAt;
  if (leftRatedAt === null || rightRatedAt === null) {
    return left.reelPosition - right.reelPosition || left.id.localeCompare(right.id);
  }
  return (
    leftRatedAt.localeCompare(rightRatedAt) ||
    left.reelPosition - right.reelPosition ||
    left.id.localeCompare(right.id)
  );
}
