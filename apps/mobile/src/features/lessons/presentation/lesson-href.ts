import type { DeckId } from "@/features/decks/domain/deck.model";
import type { LessonId } from "@/features/lessons/domain/lesson.model";

export function getLessonHref(lessonId: LessonId) {
  return {
    params: { lessonId },
    pathname: "/lessons/[lessonId]" as const,
  };
}

export function getDeckLessonsHref(deckId: DeckId) {
  return {
    params: { deckId },
    pathname: "/reading/[deckId]" as const,
  };
}
