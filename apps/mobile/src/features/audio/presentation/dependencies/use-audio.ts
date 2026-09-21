import type { AnswerAudioService } from "@/features/audio/domain/answer-audio.service";

import { useAppServices } from "@/infrastructure/app-services";

export type AudioCapability = Readonly<{
  answerAudioService: AnswerAudioService;
}>;

export function useAudio(): AudioCapability {
  const { answerAudioService } = useAppServices();

  return { answerAudioService };
}
