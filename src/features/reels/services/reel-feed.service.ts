import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";

export class ReelFeedService {
  createFeed(cards: readonly Flashcard[]): Flashcard[] {
    const feed = [...cards];

    for (let index = feed.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      const currentCard = feed[index];
      const swapCard = feed[swapIndex];
      if (!currentCard || !swapCard) {
        continue;
      }
      feed[index] = swapCard;
      feed[swapIndex] = currentCard;
    }

    return feed;
  }
}
