import type { DeckId } from "@/features/decks/domain/deck.model";
export type DeckChange = Readonly<{
  deckId: DeckId;
  kind: "first-install" | "update" | "remove" | "reset";
}>;
export interface StudySessionSettlement {
  settleDeckChange(change: DeckChange): Promise<void>;
  settleForProgressBackup(): Promise<void>;
}
