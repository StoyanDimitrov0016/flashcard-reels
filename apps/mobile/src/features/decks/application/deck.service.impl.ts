import type { DeckRemovalTransaction } from "@/features/decks/application/deck-removal.transaction";
import type { DeckThemeSelection } from "@/features/decks/domain/deck-theme-selection.model";
import type { DeckThemeSelectionRepository } from "@/features/decks/domain/deck-theme-selection.repository";
import type { Deck, DeckId } from "@/features/decks/domain/deck.model";
import type { DeckRepository } from "@/features/decks/domain/deck.repository";
import type {
  DeckDetails,
  DeckCatalogEntry,
  DeckWithTheme,
  DeckAudioRemover,
  DeckService,
} from "@/features/decks/domain/deck.service";
import type { FlashcardAvailabilityQuery } from "@/features/flashcards/domain/flashcard-availability.query";
import type { FlashcardRepository } from "@/features/flashcards/domain/flashcard.repository";
import type { StudySessionSettlement } from "@/features/study/application/study-session-settlement";

import { withDeckOperation } from "@/features/decks/application/deck-operation-queue";
import { OperationError } from "@/shared/errors/operation-error";

export class DeckServiceImpl implements DeckService {
  private readonly deckRepository: DeckRepository;
  private readonly deckRemovalTransaction: DeckRemovalTransaction;
  private readonly deckThemeSelectionRepository: DeckThemeSelectionRepository;
  private readonly deckAudioRemover: DeckAudioRemover | null;
  private readonly sessionSettlement: StudySessionSettlement;
  private readonly flashcards: FlashcardRepository;
  private readonly availability: FlashcardAvailabilityQuery;

  constructor(
    deckRepository: DeckRepository,
    deckThemeSelectionRepository: DeckThemeSelectionRepository,
    deckRemovalTransaction: DeckRemovalTransaction,
    deckAudioRemover: DeckAudioRemover | null,
    sessionSettlement: StudySessionSettlement,
    flashcards: FlashcardRepository,
    availability: FlashcardAvailabilityQuery
  ) {
    this.deckRepository = deckRepository;
    this.deckRemovalTransaction = deckRemovalTransaction;
    this.deckThemeSelectionRepository = deckThemeSelectionRepository;
    this.deckAudioRemover = deckAudioRemover;
    this.sessionSettlement = sessionSettlement;
    this.flashcards = flashcards;
    this.availability = availability;
  }

  async findById(id: DeckId): Promise<Deck | null> {
    return this.deckRepository.findById(id);
  }

  async getDetails(id: DeckId): Promise<DeckDetails> {
    const [deck, cards, themeSelection] = await Promise.all([
      this.deckRepository.findById(id),
      this.availability.listAvailableFlashcardsByDeckId(id),
      this.deckThemeSelectionRepository.findByDeckId(id),
    ]);
    return deck ? { deck, cards, themeSelection } : { deck: null, cards: [], themeSelection: null };
  }
  async getCatalog(): Promise<DeckCatalogEntry[]> {
    const decks = await this.deckRepository.list();
    const ids = decks.map((deck) => deck.id);
    const [themes, counts] = await Promise.all([
      this.deckThemeSelectionRepository.findThemeSelectionsByDeckIds(ids),
      this.flashcards.countFlashcardsByDeckIds(ids),
    ]);
    const byId = new Map(themes.map((theme) => [theme.deckId, theme]));
    return decks.map((deck) => {
      const themeSelection = byId.get(deck.id);
      if (!themeSelection) {
        throw new OperationError({
          code: "VIEW_LOAD_FAILED",
          context: { deckId: deck.id, operation: "deck-catalog.load" },
          message: "Missing theme selection for deck " + deck.id,
        });
      }
      return { deck, themeSelection, cardCount: counts.get(deck.id) ?? 0 };
    });
  }
  async findWithThemes(ids: readonly DeckId[]): Promise<DeckWithTheme[]> {
    const [decks, themes] = await Promise.all([
      this.deckRepository.findByIds(ids),
      this.deckThemeSelectionRepository.findThemeSelectionsByDeckIds(ids),
    ]);
    const byId = new Map(themes.map((theme) => [theme.deckId, theme]));
    const decksById = new Map(decks.map((deck) => [deck.id, deck]));
    return ids.map((deckId) => ({
      deckId,
      deck: decksById.get(deckId) ?? null,
      themeSelection: byId.get(deckId) ?? null,
    }));
  }

  async saveThemeSelection(themeSelection: DeckThemeSelection): Promise<void> {
    return this.deckThemeSelectionRepository.save(themeSelection);
  }

  async remove(id: DeckId): Promise<void> {
    const settlement = this.sessionSettlement;
    await withDeckOperation(id, async () => {
      await settlement.settleDeckChange({ deckId: id, kind: "remove" });
      await this.deckRemovalTransaction.remove(id);
      try {
        await this.deckAudioRemover?.removeDeck(id);
      } catch {
        // Orphaned audio is harmless and is replaced if the deck is installed again.
      }
    });
  }
}
