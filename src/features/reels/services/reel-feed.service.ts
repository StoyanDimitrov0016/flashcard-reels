import type { DeckId } from "@/features/decks/domain/deck.model";
import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";
import type { StudySessionScope } from "@/features/study/domain/study-session.model";
import type { StudyService } from "@/features/study/services/study.service";

export type PreparedReelFeed = Readonly<{
  cards: Flashcard[];
  currentPosition: number;
  studySessionId: string;
}>;

export class ReelFeedService {
  private readonly studyService: StudyService;

  constructor(studyService: StudyService) {
    this.studyService = studyService;
  }

  async prepareFeed(
    cards: readonly Flashcard[],
    scope: StudySessionScope,
    deckId: DeckId | null,
    replaceExistingSession: boolean
  ): Promise<PreparedReelFeed> {
    let openedSession = await this.studyService.openSession(scope, deckId, replaceExistingSession);
    let items = openedSession.created
      ? []
      : await this.studyService.listSessionItems(openedSession.session.id);

    if (!openedSession.created && items.length === 0) {
      await this.studyService.completeSession(openedSession.session.id);
      openedSession = await this.studyService.openSession(scope, deckId, true);
      items = [];
    }

    if (openedSession.created) {
      const preparedCards = this.shuffle(cards);
      await this.studyService.createSessionItems(openedSession.session.id, preparedCards);
      return {
        cards: preparedCards,
        currentPosition: openedSession.session.currentPosition,
        studySessionId: openedSession.session.id,
      };
    }

    const cardsById = new Map(cards.map((card) => [card.id, card] as const));
    const resumedCards = items.map((item) => {
      const card = cardsById.get(item.flashcardId);
      if (!card) {
        throw new Error(`Missing flashcard ${item.flashcardId} for study session`);
      }
      return card;
    });

    return {
      cards: resumedCards,
      currentPosition: openedSession.session.currentPosition,
      studySessionId: openedSession.session.id,
    };
  }

  private shuffle(cards: readonly Flashcard[]): Flashcard[] {
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
