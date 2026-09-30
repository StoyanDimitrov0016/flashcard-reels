import type { AudioReference } from "@/features/audio/domain/audio-reference";

export interface FlashcardAudioService {
  findSourceForFlashcard(
    deckId: string,
    revision: number,
    flashcardId: string,
    hasAudio: boolean
  ): AudioReference;
}
