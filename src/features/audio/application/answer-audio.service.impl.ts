import type { AudioSource } from "expo-audio";

import type { AnswerAudioRepository } from "@/features/audio/domain/answer-audio.repository";
import type { AnswerAudioService } from "@/features/audio/domain/answer-audio.service";

export class AnswerAudioServiceImpl implements AnswerAudioService {
  private readonly answerAudioRepository: AnswerAudioRepository;

  constructor(answerAudioRepository: AnswerAudioRepository) {
    this.answerAudioRepository = answerAudioRepository;
  }

  findSourceForFlashcard(deckId: string, flashcardId: string, version?: number): AudioSource {
    return this.answerAudioRepository.findSourceForFlashcard(deckId, flashcardId, version);
  }
}
