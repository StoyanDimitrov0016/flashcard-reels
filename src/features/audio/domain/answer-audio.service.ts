import type { AudioSource } from "expo-audio";

export interface AnswerAudioService {
  findSourceForFlashcard(deckId: string, flashcardId: string, version?: number): AudioSource;
}
