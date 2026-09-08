import type { AudioSource } from "expo-audio";

import type { AnswerAudioRepository } from "@/features/audio/domain/answer-audio.repository";
import { answerAudioAssets } from "@/features/audio/infrastructure/audio-assets";

export class BundledAnswerAudioRepository implements AnswerAudioRepository {
  findSourceByFlashcardId(flashcardId: string): AudioSource {
    return answerAudioAssets[flashcardId] ?? null;
  }
}
