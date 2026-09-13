import type { DeckId } from "@/features/decks/domain/deck.model";
import type { LearnerProfile } from "@/features/learner-profile/domain/learner-profile.model";

export interface LearnerProfileService {
  findByFlashcardIds(flashcardIds: readonly string[]): Promise<ReadonlyMap<string, LearnerProfile>>;
  resetCardProgress(flashcardId: string): Promise<void>;
  resetDeckProgress(deckId: DeckId): Promise<void>;
  resetAllProgress(): Promise<void>;
}
