import type { DeckId } from "@/features/decks/domain/deck.model";
import type { LessonId } from "@/features/lessons/domain/lesson.model";

export function getLessonHref(lessonId: LessonId) {
  return {
    params: { lessonId },
    pathname: "/lessons/[lessonId]" as const,
  };
}

/** A deck's lessons, optionally opened already narrowed to a search from the Reading tab. */
export function getDeckLessonsHref(deckId: DeckId, query?: string) {
  return {
    params: query ? { deckId, query } : { deckId },
    pathname: "/reading/[deckId]" as const,
  };
}
