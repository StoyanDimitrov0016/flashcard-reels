import { z } from "zod";

import type { DeckId } from "@/features/decks/domain/deck.model";
import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";
import { FEED_ENGINE_CONFIG } from "@/features/reels/config/feed-engine";
import type { StudySessionItem } from "@/features/study/domain/study-session-item.model";
import type { StudySessionRecurrence } from "@/features/study/domain/study-session-recurrence.model";
import type { StudySessionScope } from "@/features/study/domain/study-session.model";
import type { StudySessionStrategy } from "@/features/study/domain/study-session-strategy";
import type { StudyService } from "@/features/study/services/study.service";
import type { RandomSource } from "@/features/study/config/recurrences";

const StrategyStateSchema = z.object({
  cursor: z.number().int().nonnegative().default(0),
  cycle: z.array(z.string()).default([]),
});

type StrategyState = Readonly<z.infer<typeof StrategyStateSchema>>;

export type PreparedReelOccurrences = Readonly<{
  cards: Flashcard[];
  recurrenceIds: ReadonlyMap<number, string>;
}>;

export type PreparedReelFeed = Readonly<{
  baseCards: Flashcard[];
  cards: Flashcard[];
  currentReelPosition: number;
  materializedThroughReelPosition: number;
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
    replaceExistingSession: boolean,
    strategy: StudySessionStrategy = "shuffle"
  ): Promise<PreparedReelFeed> {
    let openedSession = await this.studyService.openSession(
      scope,
      deckId,
      replaceExistingSession,
      strategy
    );
    let items = await this.studyService.listSessionItems(openedSession.session.id);

    if (!openedSession.created && items.length === 0) {
      await this.studyService.completeSession(openedSession.session.id);
      openedSession = await this.studyService.openSession(scope, deckId, true, strategy);
      items = [];
    }

    items = await this.ensureMaterialized(cards, openedSession.session, items);
    return this.buildPreparedFeed(
      cards,
      openedSession.session.id,
      openedSession.session.currentReelPosition,
      items
    );
  }

  async extendFeed(cards: readonly Flashcard[], studySessionId: string): Promise<PreparedReelFeed> {
    const session = await this.studyService.findSession(studySessionId);
    if (!session) {
      throw new Error(`Missing study session ${studySessionId}`);
    }
    const items = await this.ensureMaterialized(
      cards,
      session,
      await this.studyService.listSessionItems(studySessionId),
      FEED_ENGINE_CONFIG.futureWindowSize + FEED_ENGINE_CONFIG.materializationBatchSize
    );
    return this.buildPreparedFeed(cards, session.id, session.currentReelPosition, items);
  }

  async refreshOccurrences(
    baseCards: readonly Flashcard[],
    studySessionId: string
  ): Promise<PreparedReelOccurrences> {
    const items = await this.studyService.listSessionItems(studySessionId);
    const recurrences = await this.studyService.listSessionRecurrences(studySessionId);
    return this.mergeMaterializedReels(
      items,
      recurrences,
      new Map(baseCards.map((card) => [card.id, card]))
    );
  }

  private async ensureMaterialized(
    sourceCards: readonly Flashcard[],
    session: Readonly<{
      currentReelPosition: number;
      id: string;
      strategy: StudySessionStrategy;
      strategyState: string;
    }>,
    existingItems: readonly StudySessionItem[],
    additionalWindow: number = FEED_ENGINE_CONFIG.futureWindowSize
  ): Promise<StudySessionItem[]> {
    const recurrences = await this.studyService.listSessionRecurrences(session.id);
    const occupiedRecurrencePositions = new Set(
      recurrences.map((recurrence) => recurrence.targetReelPosition)
    );
    const targetPosition = session.currentReelPosition + additionalWindow;
    const materializeBatch = async (
      items: readonly StudySessionItem[],
      strategyState: StrategyState
    ): Promise<StudySessionItem[]> => {
      if (this.maxMaterializedPosition(items) >= targetPosition) {
        return [...items];
      }
      const batchCards: Flashcard[] = [];
      const batchReelPositions: number[] = [];
      let nextReelPosition = this.maxMaterializedPosition(items) + 1;

      while (
        nextReelPosition <= targetPosition &&
        batchCards.length < FEED_ENGINE_CONFIG.materializationBatchSize
      ) {
        if (occupiedRecurrencePositions.has(nextReelPosition)) {
          nextReelPosition += 1;
          continue;
        }

        const nextCard = this.nextCard(sourceCards, session.strategy, strategyState);
        if (!nextCard.card) {
          break;
        }
        batchCards.push(nextCard.card);
        batchReelPositions.push(nextReelPosition);
        nextReelPosition += 1;
        strategyState = nextCard.state;
      }

      if (batchCards.length === 0) {
        return [...items];
      }

      await this.studyService.createSessionItems(
        session.id,
        batchCards,
        items.length,
        batchReelPositions
      );
      await this.studyService.updateStrategyState(session.id, JSON.stringify(strategyState));
      return materializeBatch(await this.studyService.listSessionItems(session.id), strategyState);
    };

    return materializeBatch(existingItems, parseStrategyState(session.strategyState));
  }

  private async buildPreparedFeed(
    sourceCards: readonly Flashcard[],
    studySessionId: string,
    currentReelPosition: number,
    items: readonly StudySessionItem[]
  ): Promise<PreparedReelFeed> {
    const recurrences = await this.studyService.listSessionRecurrences(studySessionId);
    const occurrences = this.mergeMaterializedReels(
      items,
      recurrences,
      new Map(sourceCards.map((card) => [card.id, card]))
    );
    const cardsById = new Map(sourceCards.map((card) => [card.id, card]));
    const baseCards = items.map((item) => {
      const card = cardsById.get(item.flashcardId);
      if (!card) {
        throw new Error(`Missing flashcard ${item.flashcardId} for prepared feed`);
      }
      return card;
    });

    return {
      baseCards,
      cards: occurrences.cards,
      currentReelPosition,
      materializedThroughReelPosition: this.maxMaterializedPosition(items, recurrences),
      recurrenceIds: occurrences.recurrenceIds,
      studySessionId,
    };
  }

  private nextCard(
    cards: readonly Flashcard[],
    strategy: StudySessionStrategy,
    state: StrategyState
  ): Readonly<{ card: Flashcard | null; state: StrategyState }> {
    if (cards.length === 0) {
      return { card: null, state };
    }

    if (strategy === "ordered") {
      const orderedCards = this.orderCards(cards);
      const card = orderedCards[state.cursor % orderedCards.length] ?? null;
      return { card, state: { cursor: state.cursor + 1, cycle: [] } };
    }

    let cycle = [...state.cycle];
    let cursor = state.cursor;
    if (cursor >= cycle.length || cycle.length === 0) {
      cycle = this.shuffle(cards).map((card) => card.id);
      cursor = 0;
    }

    const cardId = cycle[cursor];
    const card = cards.find((candidate) => candidate.id === cardId) ?? null;
    return { card, state: { cursor: cursor + 1, cycle } };
  }

  private mergeMaterializedReels(
    items: readonly StudySessionItem[],
    recurrences: readonly StudySessionRecurrence[],
    cardsById: ReadonlyMap<string, Flashcard>
  ): PreparedReelOccurrences {
    const itemByPosition = new Map(items.map((item) => [item.reelPosition, item] as const));
    const recurrenceByPosition = new Map(
      recurrences.map((recurrence) => [recurrence.targetReelPosition, recurrence] as const)
    );
    const through = this.maxMaterializedPosition(items, recurrences);
    const cards: Flashcard[] = [];
    const recurrenceIds = new Map<number, string>();

    for (let reelPosition = 0; reelPosition <= through; reelPosition += 1) {
      const recurrence = recurrenceByPosition.get(reelPosition);
      const item = itemByPosition.get(reelPosition);
      const cardId = recurrence?.flashcardId ?? item?.flashcardId;
      if (!cardId) {
        throw new Error(`Missing materialized reel at position ${reelPosition}`);
      }
      const card = cardsById.get(cardId);
      if (!card) {
        throw new Error(`Missing flashcard ${cardId} for prepared reel`);
      }
      cards.push(card);
      if (recurrence && recurrence.consumedAt === null) {
        recurrenceIds.set(reelPosition, recurrence.id);
      }
    }
    return { cards, recurrenceIds };
  }

  private maxMaterializedPosition(
    items: readonly StudySessionItem[],
    recurrences: readonly StudySessionRecurrence[] = []
  ): number {
    let maximum = items.reduce((current, item) => Math.max(current, item.reelPosition), -1);
    let advanced = true;
    while (advanced) {
      advanced = false;
      if (recurrences.some((recurrence) => recurrence.targetReelPosition === maximum + 1)) {
        maximum += 1;
        advanced = true;
      }
    }
    return maximum;
  }

  private orderCards(cards: readonly Flashcard[]): Flashcard[] {
    const orderedCards: Flashcard[] = [];
    for (const card of cards) {
      const insertionIndex = orderedCards.findIndex(
        (current) =>
          card.deckPosition < current.deckPosition ||
          (card.deckPosition === current.deckPosition && card.id.localeCompare(current.id) < 0)
      );
      if (insertionIndex < 0) {
        orderedCards.push(card);
      } else {
        orderedCards.splice(insertionIndex, 0, card);
      }
    }
    return orderedCards;
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

function parseStrategyState(rawState: string): StrategyState {
  try {
    const parsed = StrategyStateSchema.safeParse(JSON.parse(rawState));
    return parsed.success ? parsed.data : { cursor: 0, cycle: [] };
  } catch {
    return { cursor: 0, cycle: [] };
  }
}
