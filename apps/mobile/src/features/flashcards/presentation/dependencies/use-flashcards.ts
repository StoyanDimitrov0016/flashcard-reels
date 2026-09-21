import type { FlashcardService } from "@/features/flashcards/domain/flashcard.service";

import { useAppServices } from "@/infrastructure/app-services";

export type FlashcardsCapability = Readonly<{
  flashcardService: FlashcardService;
}>;

export function useFlashcardsCapability(): FlashcardsCapability {
  const { flashcardService } = useAppServices();

  return { flashcardService };
}
