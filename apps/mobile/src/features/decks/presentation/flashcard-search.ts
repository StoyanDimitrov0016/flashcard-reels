import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";

import { matchesSearchText } from "@/shared/presentation/text-search";

export function matchesFlashcardSearch(
  card: Pick<Flashcard, "answer" | "question">,
  query: string
): boolean {
  return matchesSearchText(query, card.question, card.answer);
}
