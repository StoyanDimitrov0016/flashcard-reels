import type { AudioSource } from "expo-audio";

import type { AnswerAudioRepository } from "@/features/audio/domain/answer-audio.repository";

export class AnswerAudioService {
  private readonly answerAudioRepository: AnswerAudioRepository;

  constructor(answerAudioRepository: AnswerAudioRepository) {
    this.answerAudioRepository = answerAudioRepository;
  }

  findSourceForFlashcard(flashcardId: string): AudioSource {
    return this.answerAudioRepository.findSourceByFlashcardId(flashcardId);
  }
}
