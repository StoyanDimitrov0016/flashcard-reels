import type { Deck, DeckCoverAsset, DeckId } from "@/features/decks/domain/deck.model";

export type InstalledDeckIdentity = Readonly<{ authorId: string; revision: number }>;

export interface DeckRepository {
  findInstalledIdentity(id: DeckId): Promise<InstalledDeckIdentity | null>;
  findRevision(id: DeckId): Promise<number | null>;
  findById(id: DeckId): Promise<Deck | null>;
  findByIds(ids: readonly DeckId[]): Promise<Deck[]>;
  list(): Promise<Deck[]>;
  updateCoverAsset(deckId: DeckId, coverAsset: DeckCoverAsset): Promise<void>;
}
