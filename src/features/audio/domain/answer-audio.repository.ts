import type { AudioSource } from "expo-audio";

export interface AnswerAudioRepository {
  findSourceForFlashcard(deckId: string, flashcardId: string, version?: number): AudioSource;
}
