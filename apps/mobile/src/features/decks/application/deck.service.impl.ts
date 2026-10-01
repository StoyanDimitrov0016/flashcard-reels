import type { DeckRemovalTransaction } from "@/features/decks/application/deck-removal.transaction";
import type { DeckThemeSelection } from "@/features/decks/domain/deck-theme-selection.model";
import type { DeckThemeSelectionRepository } from "@/features/decks/domain/deck-theme-selection.repository";
import type { Deck, DeckId } from "@/features/decks/domain/deck.model";
import type { DeckRepository } from "@/features/decks/domain/deck.repository";
import type { DeckAudioRemover, DeckService } from "@/features/decks/domain/deck.service";
import type { StudySessionSettlement } from "@/features/study/application/study-session-settlement";

import { withDeckOperation } from "@/features/decks/application/deck-operation-queue";

export class DeckServiceImpl implements DeckService {
  private readonly deckRepository: DeckRepository;
  private readonly deckRemovalTransaction: DeckRemovalTransaction;
  private readonly deckThemeSelectionRepository: DeckThemeSelectionRepository;
  private readonly deckAudioRemover: DeckAudioRemover | null;
  private readonly sessionSettlement: StudySessionSettlement | null;

  constructor(
    deckRepository: DeckRepository,
    deckThemeSelectionRepository: DeckThemeSelectionRepository,
    deckRemovalTransaction: DeckRemovalTransaction,
    deckAudioRemover: DeckAudioRemover | null = null,
    sessionSettlement: StudySessionSettlement | null = null
  ) {
    this.deckRepository = deckRepository;
    this.deckRemovalTransaction = deckRemovalTransaction;
    this.deckThemeSelectionRepository = deckThemeSelectionRepository;
    this.deckAudioRemover = deckAudioRemover;
    this.sessionSettlement = sessionSettlement;
  }

  async findById(id: DeckId): Promise<Deck | null> {
    return this.deckRepository.findById(id);
  }

  async findByIds(ids: readonly DeckId[]): Promise<Deck[]> {
    return this.deckRepository.findByIds(ids);
  }

  async getThemeSelection(deckId: DeckId): Promise<DeckThemeSelection | null> {
    return this.deckThemeSelectionRepository.findByDeckId(deckId);
  }

  async getThemeSelections(deckIds: readonly DeckId[]): Promise<DeckThemeSelection[]> {
    return this.deckThemeSelectionRepository.findThemeSelectionsByDeckIds(deckIds);
  }

  async list(): Promise<Deck[]> {
    return this.deckRepository.list();
  }

  async saveThemeSelection(themeSelection: DeckThemeSelection): Promise<void> {
    return this.deckThemeSelectionRepository.save(themeSelection);
  }

  async remove(id: DeckId): Promise<void> {
    if (!this.sessionSettlement) {
      throw new Error("Study session settlement is required before removing a deck");
    }
    const settlement = this.sessionSettlement;
    await withDeckOperation(id, async () => {
      await settlement.settleBeforeDeckRemoval(id);
      await this.deckRemovalTransaction.remove(id);
      try {
        await this.deckAudioRemover?.removeDeck(id);
      } catch {
        // Orphaned audio is harmless and is replaced if the deck is installed again.
      }
    });
  }
}
