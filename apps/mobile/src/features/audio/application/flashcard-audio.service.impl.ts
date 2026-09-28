import type { AudioReference } from "@/features/audio/domain/audio-reference";
import type { FlashcardAudioRepository } from "@/features/audio/domain/flashcard-audio.repository";
import type { FlashcardAudioService } from "@/features/audio/domain/flashcard-audio.service";

export class FlashcardAudioServiceImpl implements FlashcardAudioService {
  private readonly flashcardAudioRepository: FlashcardAudioRepository;

  constructor(flashcardAudioRepository: FlashcardAudioRepository) {
    this.flashcardAudioRepository = flashcardAudioRepository;
  }

  findSourceForFlashcard(deckId: string, revision: number, flashcardId: string): AudioReference {
    return this.flashcardAudioRepository.findSourceForFlashcard(deckId, revision, flashcardId);
  }
}
