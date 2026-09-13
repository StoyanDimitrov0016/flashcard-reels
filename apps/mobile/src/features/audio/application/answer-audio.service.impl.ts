import type { AnswerAudioRepository } from "@/features/audio/domain/answer-audio.repository";
import type { AnswerAudioService } from "@/features/audio/domain/answer-audio.service";
import type { AudioReference, AudioSide } from "@/features/audio/domain/audio-reference";

export class AnswerAudioServiceImpl implements AnswerAudioService {
  private readonly answerAudioRepository: AnswerAudioRepository;

  constructor(answerAudioRepository: AnswerAudioRepository) {
    this.answerAudioRepository = answerAudioRepository;
  }

  findSourceForFlashcard(
    deckId: string,
    version: number,
    flashcardId: string,
    side: AudioSide
  ): AudioReference {
    return this.answerAudioRepository.findSourceForFlashcard(deckId, version, flashcardId, side);
  }
}
