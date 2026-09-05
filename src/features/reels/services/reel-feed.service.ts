import type { DeckId } from "@/features/decks/domain/deck.model";
import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";
import type { StudySessionRecurrence } from "@/features/study/domain/study-session-recurrence.model";
import type { StudySessionScope } from "@/features/study/domain/study-session.model";
import type { StudyService } from "@/features/study/services/study.service";

export type PreparedReelOccurrences = Readonly<{
  cards: Flashcard[];
  recurrenceIds: ReadonlyMap<number, string>;
}>;

export type PreparedReelFeed = Readonly<{
  baseCards: Flashcard[];
  cards: Flashcard[];
  currentPosition: number;
  recurrenceIds: ReadonlyMap<number, string>;
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
      const occurrences = await this.loadOccurrences(preparedCards, openedSession.session.id);
      return {
        baseCards: preparedCards,
        ...occurrences,
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

    const occurrences = await this.loadOccurrences(resumedCards, openedSession.session.id);
    return {
      baseCards: resumedCards,
      ...occurrences,
      currentPosition: openedSession.session.currentPosition,
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
    type RecurrenceOccurrence = Readonly<{
      card: Flashcard;
      recurrence: StudySessionRecurrence;
    }>;
    type FeedOccurrence = Readonly<{
      card: Flashcard;
      recurrence: StudySessionRecurrence | null;
      sortPosition: number;
    }>;

    const cardsById = new Map(baseCards.map((card) => [card.id, card] as const));
    const recurrenceOccurrences = recurrences.reduce<RecurrenceOccurrence[]>(
      (sorted, recurrence) => {
        const card = cardsById.get(recurrence.flashcardId);
        if (!card) {
          return sorted;
        }
        return this.insertSorted(
          sorted,
          { card, recurrence },
          (left, right) =>
            left.recurrence.targetPosition - right.recurrence.targetPosition ||
            left.recurrence.createdAt.localeCompare(right.recurrence.createdAt) ||
            left.recurrence.id.localeCompare(right.recurrence.id)
        );
      },
      []
    );
    const occurrences = [
      ...baseCards.map<FeedOccurrence>((card, sortPosition) => ({
        card,
        recurrence: null,
        sortPosition,
      })),
      ...recurrenceOccurrences.map<FeedOccurrence>(({ card, recurrence }) => ({
        card,
        recurrence,
        sortPosition: recurrence.targetPosition,
      })),
    ].reduce<FeedOccurrence[]>(
      (sorted, occurrence) =>
        this.insertSorted(
          sorted,
          occurrence,
          (left, right) =>
            left.sortPosition - right.sortPosition ||
            (left.recurrence ? -1 : 0) - (right.recurrence ? -1 : 0) ||
            (left.recurrence?.createdAt ?? "").localeCompare(right.recurrence?.createdAt ?? "") ||
            (left.recurrence?.id ?? "").localeCompare(right.recurrence?.id ?? "")
        ),
      []
    );

    const recurrenceIds = new Map<number, string>();
    const cards = occurrences.map((occurrence, position) => {
      if (occurrence.recurrence) {
        recurrenceIds.set(position, occurrence.recurrence.id);
      }
      return occurrence.card;
    });
    return { cards, recurrenceIds };
  }

  private insertSorted<T>(
    items: readonly T[],
    item: T,
    compare: (left: T, right: T) => number
  ): T[] {
    const index = items.findIndex((current) => compare(item, current) < 0);
    if (index < 0) {
      return [...items, item];
    }
    return [...items.slice(0, index), item, ...items.slice(index)];
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
