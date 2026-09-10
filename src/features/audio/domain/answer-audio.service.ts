import type { AudioReference, AudioSide } from "@/features/audio/domain/audio-reference";

export interface AnswerAudioService {
  findSourceForFlashcard(
    deckId: string,
    version: number,
    flashcardId: string,
    side: AudioSide
  ): AudioReference;
}
