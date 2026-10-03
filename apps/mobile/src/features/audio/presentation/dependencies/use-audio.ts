import type { FlashcardAudioService } from "@/features/audio/domain/flashcard-audio.service";

import { useAppServices } from "@/infrastructure/app-services";

export type AudioCapability = Readonly<{
  flashcardAudioService: FlashcardAudioService;
}>;

export function useAudio(): AudioCapability {
  const { flashcardAudioService } = useAppServices();

  return { flashcardAudioService };
}
