import type { AudioReference } from "@/features/audio/domain/audio-reference";

export interface AnswerAudioService {
  findSourceForFlashcard(deckId: string, revision: number, flashcardId: string): AudioReference;
}
