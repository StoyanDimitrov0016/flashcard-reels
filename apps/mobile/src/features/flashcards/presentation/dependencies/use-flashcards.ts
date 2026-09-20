import { useAppServices } from "@/infrastructure/app-services";
import type { FlashcardService } from "@/features/flashcards/domain/flashcard.service";

export type FlashcardsCapability = Readonly<{
  flashcardService: FlashcardService;
}>;

export function useFlashcardsCapability(): FlashcardsCapability {
  const { flashcardService } = useAppServices();

  return { flashcardService };
}
