import type { AudioSource } from "expo-audio";

export interface AnswerAudioRepository {
  findSourceByFlashcardId(flashcardId: string): AudioSource;
}
