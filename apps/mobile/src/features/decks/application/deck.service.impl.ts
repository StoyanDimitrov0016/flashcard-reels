import type { DeckAppearance } from "@/features/decks/domain/deck-appearance.model";
import type { DeckAppearanceRepository } from "@/features/decks/domain/deck-appearance.repository";
import type { Deck, DeckId } from "@/features/decks/domain/deck.model";
import type { DeckRepository } from "@/features/decks/domain/deck.repository";
import type { DeckService } from "@/features/decks/domain/deck.service";

export class DeckServiceImpl implements DeckService {
  private readonly deckRepository: DeckRepository;
  private readonly deckAppearanceRepository: DeckAppearanceRepository;

  constructor(deckRepository: DeckRepository, deckAppearanceRepository: DeckAppearanceRepository) {
    this.deckRepository = deckRepository;
    this.deckAppearanceRepository = deckAppearanceRepository;
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
}
