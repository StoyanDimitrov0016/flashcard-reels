import type { DeckId } from "@/features/decks/domain/deck.model";
import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";
import type { FlashcardRepository } from "@/features/flashcards/domain/flashcard.repository";

export class FlashcardService {
  private readonly flashcardRepository: FlashcardRepository;

  constructor(flashcardRepository: FlashcardRepository) {
    this.flashcardRepository = flashcardRepository;
  }

  async findById(id: string): Promise<Flashcard | null> {
    return this.flashcardRepository.findById(id);
  }

  async list(): Promise<Flashcard[]> {
    return this.flashcardRepository.list();
  }

  async listByDeckId(deckId: DeckId): Promise<Flashcard[]> {
    return this.flashcardRepository.listByDeckId(deckId);
  }
}
