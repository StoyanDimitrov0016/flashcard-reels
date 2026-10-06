import { useMutation } from "@tanstack/react-query";

import { useFlashcardProgress } from "@/features/flashcard-progress/presentation/dependencies/use-flashcard-progress";
import { learningProgressMutations } from "@/features/flashcard-progress/presentation/mutations/learning-progress-mutations";

export function useResetDeckProgress() {
  return useMutation(learningProgressMutations.resetDeck(useFlashcardProgress()));
}
