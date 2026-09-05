import type { DeckId } from "@/features/decks/domain/deck.model";
import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";
import type { StudySessionRecurrence } from "@/features/study/domain/study-session-recurrence.model";
import type { StudySessionScope } from "@/features/study/domain/study-session.model";
import type { StudyService } from "@/features/study/services/study.service";
import type { RandomSource } from "@/features/study/config/recurrences";

export type PreparedReelOccurrences = Readonly<{
  cards: Flashcard[];
  recurrenceIds: ReadonlyMap<number, string>;
}>;

export type PreparedReelFeed = Readonly<{
  baseCards: Flashcard[];
  cards: Flashcard[];
  currentReelPosition: number;
  recurrenceIds: ReadonlyMap<number, string>;
  studySessionId: string;
}>;

export class ReelFeedService {
  private readonly studyService: StudyService;
  private readonly random: RandomSource;

  constructor(studyService: StudyService, random: RandomSource = Math.random) {
    this.studyService = studyService;
    this.random = random;
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
      const occurrences = await this.loadOccurrences(preparedCards, openedSession.session.id);
      return {
        baseCards: preparedCards,
        ...occurrences,
        currentReelPosition: openedSession.session.currentReelPosition,
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

    const occurrences = await this.loadOccurrences(resumedCards, openedSession.session.id);
    return {
      baseCards: resumedCards,
      ...occurrences,
      currentReelPosition: openedSession.session.currentReelPosition,
      studySessionId: openedSession.session.id,
    };
  }

  async refreshOccurrences(
    baseCards: readonly Flashcard[],
    studySessionId: string
  ): Promise<PreparedReelOccurrences> {
    return this.loadOccurrences(baseCards, studySessionId);
  }

  private async loadOccurrences(
    baseCards: readonly Flashcard[],
    studySessionId: string
  ): Promise<PreparedReelOccurrences> {
    const recurrences = await this.studyService.listSessionRecurrences(studySessionId);
    return this.mergeRecurrences(baseCards, recurrences);
  }

  private mergeRecurrences(
    baseCards: readonly Flashcard[],
    recurrences: readonly StudySessionRecurrence[]
  ): PreparedReelOccurrences {
    const cardsById = new Map(baseCards.map((card) => [card.id, card] as const));
    const recurrencesByReelPosition = new Map<number, StudySessionRecurrence>();
    for (const recurrence of recurrences) {
      if (recurrence.consumedAt !== null) {
        continue;
      }
      if (recurrencesByReelPosition.has(recurrence.targetReelPosition)) {
        throw new Error(
          `Duplicate pending recurrence reel position ${recurrence.targetReelPosition}`
        );
      }
      recurrencesByReelPosition.set(recurrence.targetReelPosition, recurrence);
    }

    const cards: Flashcard[] = [];
    const recurrenceIds = new Map<number, string>();
    let baseFeedPosition = 0;
    let reelPosition = 0;

    while (baseFeedPosition < baseCards.length || recurrencesByReelPosition.has(reelPosition)) {
      const recurrence = recurrencesByReelPosition.get(reelPosition);
      if (recurrence) {
        const card = cardsById.get(recurrence.flashcardId);
        if (!card) {
          throw new Error(`Missing flashcard ${recurrence.flashcardId} for recurrence`);
        }
        cards.push(card);
        recurrenceIds.set(reelPosition, recurrence.id);
      } else {
        const card = baseCards[baseFeedPosition];
        if (!card) {
          break;
        }
        cards.push(card);
        baseFeedPosition += 1;
      }
      reelPosition += 1;
    }

    // A target beyond the available base material remains pending but is not rendered. This
    // keeps the feed finite and never moves a recurrence earlier than its persisted target.
    return { cards, recurrenceIds };
  }

  private shuffle(cards: readonly Flashcard[]): Flashcard[] {
    const feed = [...cards];

    for (let index = feed.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(this.random() * (index + 1));
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
