import { useState } from "react";

import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";
import { useAppServices } from "@/infrastructure/app-services";

export function usePreparedReelFeed(cards: readonly Flashcard[]): Flashcard[] {
  const { reelFeedService } = useAppServices();
  const [preparedFeed] = useState(() => reelFeedService.createFeed(cards));

  return preparedFeed;
}
