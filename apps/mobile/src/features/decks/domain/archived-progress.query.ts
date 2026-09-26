import type { ArchivedDeckProgress } from "@/features/decks/domain/archived-deck-progress";

export interface ArchivedProgressQuery {
  listArchivedProgress(): Promise<ArchivedDeckProgress[]>;
}
