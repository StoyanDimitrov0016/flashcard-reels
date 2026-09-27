import type { Deck } from "../deck.schemas.ts";
import type { DeckParseIssue } from "../errors/deck-parse-issue.ts";

import { DeckParseError } from "../errors/deck-parse-error.ts";

/** Checks invariants that depend on more than one manifest entry. */
export function validateDeckRelationships(deck: Deck): void {
  const issues: DeckParseIssue[] = [];
  const flashcardIds = new Set<string>();
  for (const [index, flashcard] of deck.cards.entries()) {
    if (flashcardIds.has(flashcard.id)) {
      issues.push({
        message: `Duplicate flashcard ID: ${flashcard.id}`,
        path: ["cards", index, "id"],
      });
    }
    flashcardIds.add(flashcard.id);
  }

  const lessonIds = new Set<string>();
  for (const [index, lesson] of deck.lessons.entries()) {
    if (lessonIds.has(lesson.id) || flashcardIds.has(lesson.id)) {
      issues.push({
        message: `Duplicate lesson ID: ${lesson.id}`,
        path: ["lessons", index, "id"],
      });
    }
    lessonIds.add(lesson.id);
  }

  for (const [index, flashcard] of deck.cards.entries()) {
    if (flashcard.lessonId !== null && !lessonIds.has(flashcard.lessonId)) {
      issues.push({
        message: `Flashcard ${flashcard.id} references a lesson outside this deck: ${flashcard.lessonId}`,
        path: ["cards", index, "lessonId"],
      });
    }
  }

  if (issues.length > 0) {
    throw new DeckParseError(issues);
  }
}
