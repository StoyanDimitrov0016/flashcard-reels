import { DeckParseError, type DeckParseIssue } from "./deck.errors";
import { DeckSchema, type Deck } from "./deck.schemas";

/** Parses the manifest format before checking relationships between its entries. */
export class DeckValidator {
  parse(input: unknown): Deck {
    const result = DeckSchema.safeParse(input);
    if (!result.success) {
      throw new DeckParseError(
        result.error.issues.map((issue) => ({
          message: issue.message,
          path: issue.path.map((segment) =>
            typeof segment === "symbol" ? String(segment) : segment
          ),
        })),
        { cause: result.error }
      );
    }
    this.validateRelationships(result.data);
    return result.data;
  }

  private validateRelationships(deck: Deck): void {
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
}
