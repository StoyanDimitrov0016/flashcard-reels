import type { AudioSource } from "expo-audio";

export interface AnswerAudioService {
  findSourceForFlashcard(flashcardId: string): AudioSource;
}
