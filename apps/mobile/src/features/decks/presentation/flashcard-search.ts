import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";

export function matchesFlashcardSearch(
  card: Pick<Flashcard, "answer" | "question">,
  query: string
): boolean {
  const normalized = query.trim().toLocaleLowerCase();
  return (
    normalized.length === 0 ||
    card.question.toLocaleLowerCase().includes(normalized) ||
    card.answer.toLocaleLowerCase().includes(normalized)
  );
}
