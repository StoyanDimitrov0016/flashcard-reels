import type { AudioSource } from "expo-audio";

import { answerAudioAssets } from "@/features/audio/data/answer-audio-assets";
import type { AnswerAudioRepository } from "@/features/audio/domain/answer-audio.repository";

export class BundledAnswerAudioRepository implements AnswerAudioRepository {
  findSourceByFlashcardId(flashcardId: string): AudioSource {
    return answerAudioAssets[flashcardId] ?? null;
  }
}
