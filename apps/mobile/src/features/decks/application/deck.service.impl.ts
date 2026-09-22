import type {
  ArchivedDeckProgress,
  PendingDeckProgress,
} from "@/features/decks/domain/archived-deck-progress";
import type { DeckAppearance } from "@/features/decks/domain/deck-appearance.model";
import type { DeckAppearanceRepository } from "@/features/decks/domain/deck-appearance.repository";
import type { Deck, DeckId } from "@/features/decks/domain/deck.model";
import type { DeckRepository } from "@/features/decks/domain/deck.repository";
import type { DeckAudioRemover, DeckService } from "@/features/decks/domain/deck.service";
import type { StudySessionSettlement } from "@/features/study/application/study-session-settlement";

export class DeckServiceImpl implements DeckService {
  private readonly deckRepository: DeckRepository;
  private readonly deckAppearanceRepository: DeckAppearanceRepository;
  private readonly deckAudioRemover: DeckAudioRemover | null;
  private readonly sessionSettlement: StudySessionSettlement | null;

  constructor(
    deckRepository: DeckRepository,
    deckAppearanceRepository: DeckAppearanceRepository,
    deckAudioRemover: DeckAudioRemover | null = null,
    sessionSettlement: StudySessionSettlement | null = null
  ) {
    this.deckRepository = deckRepository;
    this.deckAppearanceRepository = deckAppearanceRepository;
    this.deckAudioRemover = deckAudioRemover;
    this.sessionSettlement = sessionSettlement;
  }

  async findById(id: DeckId): Promise<Deck | null> {
    return this.deckRepository.findById(id);
  }

  async findByIds(ids: readonly DeckId[]): Promise<Deck[]> {
    return this.deckRepository.findByIds(ids);
  }

  async getAppearance(deckId: DeckId): Promise<DeckAppearance | null> {
    return this.deckAppearanceRepository.findByDeckId(deckId);
  }

  async getAppearances(deckIds: readonly DeckId[]): Promise<DeckAppearance[]> {
    return this.deckAppearanceRepository.findAppearancesByDeckIds(deckIds);
  }

  async list(): Promise<Deck[]> {
    return this.deckRepository.list();
  }

  async saveAppearance(appearance: DeckAppearance): Promise<void> {
    return this.deckAppearanceRepository.save(appearance);
  }

  async remove(id: DeckId): Promise<void> {
    await this.sessionSettlement?.settleActiveSessionsAffectedByDeck(id, true);
    await this.deckRepository.remove(id);
    try {
      await this.deckAudioRemover?.removeDeck(id);
    } catch {
      // Orphaned audio is harmless and is replaced if the deck is installed again.
    }
  }

  async listArchivedProgress(): Promise<ArchivedDeckProgress[]> {
    return this.deckRepository.listArchivedProgress();
  }

  async listPendingProgress(): Promise<PendingDeckProgress[]> {
    return this.deckRepository.listPendingProgress();
  }

  async continueProgress(id: DeckId): Promise<void> {
    await this.deckRepository.continueProgress(id);
  }

  async deleteProgress(id: DeckId): Promise<void> {
    await this.deckRepository.deleteProgress(id);
  }
}
