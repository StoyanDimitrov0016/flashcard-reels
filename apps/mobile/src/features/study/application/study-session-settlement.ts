import type { DeckId } from "@/features/decks/domain/deck.model";

export interface StudySessionSettlement {
  settleActiveSessionsAffectedByDeck(deckId: DeckId, includeFocused: boolean): Promise<void>;
  settleBeforeDeckRemoval(deckId: DeckId): Promise<void>;
}
