import type { DeckReadingList } from "@/features/lessons/domain/lesson.model";

/** Installed decks that have lessons, with lesson titles in reading order. */
export interface ReadingListQuery {
  listReadingLists(): Promise<DeckReadingList[]>;
}
