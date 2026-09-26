import type { DeckId } from "@/features/decks/domain/deck.model";
import type { FlashcardAvailabilityQuery } from "@/features/flashcards/domain/flashcard-availability.query";
import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";
import type { FlashcardRepository } from "@/features/flashcards/domain/flashcard.repository";
import type { FlashcardService } from "@/features/flashcards/domain/flashcard.service";

export class FlashcardServiceImpl implements FlashcardService {
  private readonly flashcardRepository: FlashcardRepository;
  private readonly availabilityQuery: FlashcardAvailabilityQuery;

  constructor(
    flashcardRepository: FlashcardRepository,
    availabilityQuery: FlashcardAvailabilityQuery
  ) {
    this.flashcardRepository = flashcardRepository;
    this.availabilityQuery = availabilityQuery;
  }

  async countFlashcardsByDeckIds(deckIds: readonly DeckId[]): Promise<ReadonlyMap<DeckId, number>> {
    return this.flashcardRepository.countFlashcardsByDeckIds(deckIds);
  }

  async findById(id: string): Promise<Flashcard | null> {
    return this.flashcardRepository.findById(id);
  }

  async list(): Promise<Flashcard[]> {
    return this.availabilityQuery.listAvailableFlashcards();
  }

  async listByDeckId(deckId: DeckId): Promise<Flashcard[]> {
    return this.availabilityQuery.listAvailableFlashcardsByDeckId(deckId);
  }
}
