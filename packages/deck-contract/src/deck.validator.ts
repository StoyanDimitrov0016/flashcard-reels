import { DeckValidationError, type DeckValidationIssue } from "./deck.errors";
import { DeckSchema, type Deck } from "./deck.schemas";

/** Parses the manifest format before checking relationships between its entries. */
export class DeckValidator {
  parse(input: unknown): Deck {
    const deck = DeckSchema.parse(input);
    this.validateRelationships(deck);
    return deck;
  }

  private validateRelationships(deck: Deck): void {
    const issues: DeckValidationIssue[] = [];
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
      throw new DeckValidationError(issues);
    }
  }
}
