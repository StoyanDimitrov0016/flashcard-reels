import type { DeckId } from "@/features/decks/domain/deck.model";
import type { LearnerProfile } from "@/features/learner-profile/domain/learner-profile.model";

export interface LearnerProfileRepository {
  findByFlashcardId(flashcardId: string): Promise<LearnerProfile | null>;
  findByFlashcardIds(flashcardIds: readonly string[]): Promise<ReadonlyMap<string, LearnerProfile>>;
  resetCard(flashcardId: string, resetAt: string): Promise<void>;
  resetDeck(deckId: DeckId, resetAt: string): Promise<void>;
  resetAll(resetAt: string): Promise<void>;
}
