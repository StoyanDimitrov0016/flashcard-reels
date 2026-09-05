import { useState } from "react";

import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";

export function useShuffledCards(cards: Flashcard[]) {
  const [shuffledCards] = useState(() =>
    // This array is newly allocated above, so sorting it cannot mutate application data.
    cards
      .map((card) => ({ card, order: Math.random() }))
      // oxlint-disable-next-line unicorn/no-array-sort -- Hermes does not support Array.prototype.toSorted.
      .sort((left, right) => left.order - right.order)
      .map(({ card }) => card)
  );

  return shuffledCards;
}
