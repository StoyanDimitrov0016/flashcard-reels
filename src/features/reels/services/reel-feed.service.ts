import { z } from "zod";

import type { DeckId } from "@/features/decks/domain/deck.model";
import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";
import { FEED_ENGINE_CONFIG } from "@/features/reels/config/feed-engine";
import type { StudySessionRecurrence } from "@/features/study/domain/study-session-recurrence.model";
import type { StudySessionScope } from "@/features/study/domain/study-session.model";
import type { StudySessionItem } from "@/features/study/domain/study-session-item.model";
import type { StudySessionStrategy } from "@/features/study/domain/study-session-strategy";
import type { StudyService } from "@/features/study/services/study.service";
import type { RandomSource } from "@/features/study/config/recurrences";

const StrategyStateSchema = z.object({
  cursor: z.number().int().nonnegative().default(0),
  cycle: z.array(z.string()).default([]),
});

type StrategyState = Readonly<z.infer<typeof StrategyStateSchema>>;

export type PreparedReelOccurrence = Readonly<{
  card: Flashcard;
  key: string;
  recurrenceId: string | null;
  reelPosition: number;
}>;

export type PreparedReelOccurrences = readonly PreparedReelOccurrence[];

export type PreparedReelFeed = Readonly<{
  occurrences: PreparedReelOccurrences;
  currentReelPosition: number;
  loadedFromReelPosition: number;
  loadedThroughReelPosition: number;
  materializedThroughReelPosition: number;
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
    const hasItems =
      (await this.studyService.findMaxSessionBaseFeedPosition(openedSession.session.id)) !== null;

    if (!openedSession.created && !hasItems) {
      await this.studyService.completeSession(openedSession.session.id);
      openedSession = await this.studyService.openSession(scope, deckId, true, strategy);
    }

    await this.ensureMaterialized(cards, openedSession.session);
    return this.buildPreparedFeed(cards, openedSession.session);
  }

  async extendFeed(cards: readonly Flashcard[], studySessionId: string): Promise<PreparedReelFeed> {
    const session = await this.studyService.findSession(studySessionId);
    if (!session) {
      throw new Error(`Missing study session ${studySessionId}`);
    }
    await this.ensureMaterialized(
      cards,
      session,
      FEED_ENGINE_CONFIG.futureWindowSize + FEED_ENGINE_CONFIG.materializationBatchSize
    );
    return this.buildPreparedFeed(cards, session);
  }

  async refreshOccurrences(
    sourceCards: readonly Flashcard[],
    studySessionId: string
  ): Promise<PreparedReelOccurrences> {
    const feed = await this.refreshFeed(sourceCards, studySessionId);
    return feed.occurrences;
  }

  async refreshFeed(
    sourceCards: readonly Flashcard[],
    studySessionId: string
  ): Promise<PreparedReelFeed> {
    const session = await this.studyService.findSession(studySessionId);
    if (!session) {
      throw new Error(`Missing study session ${studySessionId}`);
    }
    return this.buildPreparedFeed(sourceCards, session);
  }

  private async ensureMaterialized(
    sourceCards: readonly Flashcard[],
    session: Readonly<{
      currentReelPosition: number;
      id: string;
      strategy: StudySessionStrategy;
      strategyState: string;
    }>,
    additionalWindow: number = FEED_ENGINE_CONFIG.futureWindowSize
  ): Promise<void> {
    const targetPosition = session.currentReelPosition + additionalWindow;
    const pendingFutureRecurrenceCardIds = new Set(
      (await this.studyService.listSessionRecurrences(session.id))
        .filter(
          (recurrence) =>
            recurrence.consumedAt === null &&
            recurrence.targetReelPosition > session.currentReelPosition
        )
        .map((recurrence) => recurrence.flashcardId)
    );
    const materializeBatch = async (strategyState: StrategyState): Promise<void> => {
      const materializedThrough = await this.findMaterializedThrough(session.id, targetPosition);
      if (materializedThrough >= targetPosition) {
        return;
      }
      const batchCards: Flashcard[] = [];
      const batchReelPositions: number[] = [];
      let nextReelPosition =
        ((await this.studyService.findMaxSessionReelPosition(session.id)) ?? -1) + 1;
      const reservedRecurrences = await this.studyService.listSessionRecurrencesInTargetRange(
        session.id,
        nextReelPosition,
        targetPosition
      );
      const occupiedRecurrencePositions = new Set(
        reservedRecurrences.map((recurrence) => recurrence.targetReelPosition)
      );
      const baseFeedPositionStart =
        ((await this.studyService.findMaxSessionBaseFeedPosition(session.id)) ?? -1) + 1;

      while (
        nextReelPosition <= targetPosition &&
        batchCards.length < FEED_ENGINE_CONFIG.materializationBatchSize
      ) {
        if (occupiedRecurrencePositions.has(nextReelPosition)) {
          nextReelPosition += 1;
          continue;
        }

        const nextCard = this.nextCard(
          sourceCards,
          session.strategy,
          strategyState,
          pendingFutureRecurrenceCardIds
        );
        if (!nextCard.card) {
          break;
        }
        batchCards.push(nextCard.card);
        batchReelPositions.push(nextReelPosition);
        nextReelPosition += 1;
        strategyState = nextCard.state;
      }

      if (batchCards.length === 0) {
        return;
      }

      await this.studyService.appendSessionItems(
        session.id,
        batchCards,
        JSON.stringify(strategyState),
        baseFeedPositionStart,
        batchReelPositions
      );
      await materializeBatch(strategyState);
    };

    return materializeBatch(parseStrategyState(session.strategyState));
  }

  private async buildPreparedFeed(
    sourceCards: readonly Flashcard[],
    session: Readonly<{ currentReelPosition: number; id: string }>
  ): Promise<PreparedReelFeed> {
    const materializedThrough = await this.findMaterializedThrough(
      session.id,
      session.currentReelPosition + FEED_ENGINE_CONFIG.futureWindowSize
    );
    const loadedFromReelPosition = Math.max(
      0,
      session.currentReelPosition - FEED_ENGINE_CONFIG.pastWindowSize
    );
    const loadedThroughReelPosition = Math.min(
      session.currentReelPosition + FEED_ENGINE_CONFIG.futureWindowSize,
      materializedThrough
    );
    const items =
      loadedFromReelPosition <= loadedThroughReelPosition
        ? await this.studyService.listSessionItemsInReelPositionRange(
            session.id,
            loadedFromReelPosition,
            loadedThroughReelPosition
          )
        : [];
    const recurrences =
      loadedFromReelPosition <= loadedThroughReelPosition
        ? await this.studyService.listSessionRecurrencesInTargetRange(
            session.id,
            loadedFromReelPosition,
            loadedThroughReelPosition
          )
        : [];
    const occurrences = this.mergeMaterializedReels(
      items,
      recurrences,
      new Map(sourceCards.map((card) => [card.id, card])),
      loadedFromReelPosition,
      loadedThroughReelPosition
    );

    return {
      currentReelPosition: session.currentReelPosition,
      loadedFromReelPosition,
      loadedThroughReelPosition,
      materializedThroughReelPosition: materializedThrough,
      occurrences,
      studySessionId: session.id,
    };
  }

  private nextCard(
    cards: readonly Flashcard[],
    strategy: StudySessionStrategy,
    state: StrategyState,
    excludedCardIds: ReadonlySet<string> = new Set()
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

    for (let offset = 0; offset < cycle.length; offset += 1) {
      const nextCursor = cursor + offset;
      const cardId = cycle[nextCursor % cycle.length];
      const card = cards.find((candidate) => candidate.id === cardId) ?? null;
      if (card && !excludedCardIds.has(card.id)) {
        return { card, state: { cursor: nextCursor + 1, cycle } };
      }
    }
    return { card: null, state: { cursor: cursor + cycle.length, cycle } };
  }

  private mergeMaterializedReels(
    items: readonly StudySessionItem[],
    recurrences: readonly StudySessionRecurrence[],
    cardsById: ReadonlyMap<string, Flashcard>,
    fromReelPosition: number,
    throughReelPosition: number
  ): PreparedReelOccurrences {
    const itemByPosition = new Map(items.map((item) => [item.reelPosition, item] as const));
    const recurrenceByPosition = new Map(
      recurrences.map((recurrence) => [recurrence.targetReelPosition, recurrence] as const)
    );
    const occurrences: PreparedReelOccurrence[] = [];

    for (
      let reelPosition = fromReelPosition;
      reelPosition <= throughReelPosition;
      reelPosition += 1
    ) {
      const recurrence = recurrenceByPosition.get(reelPosition);
      const item = itemByPosition.get(reelPosition);
      const cardId = item?.flashcardId ?? recurrence?.flashcardId;
      if (!cardId) {
        throw new Error(`Missing materialized reel at position ${reelPosition}`);
      }
      const card = cardsById.get(cardId);
      if (!card) {
        throw new Error(`Missing flashcard ${cardId} for prepared reel`);
      }
      occurrences.push({
        card,
        key: `${card.id}-${reelPosition}`,
        recurrenceId: recurrence?.consumedAt === null ? recurrence.id : null,
        reelPosition,
      });
    }
    return occurrences;
  }

  private async findMaterializedThrough(studySessionId: string, through: number): Promise<number> {
    let materializedThrough =
      (await this.studyService.findMaxSessionReelPosition(studySessionId)) ?? -1;
    if (materializedThrough >= through) {
      return materializedThrough;
    }
    const recurrences = await this.studyService.listSessionRecurrencesInTargetRange(
      studySessionId,
      materializedThrough + 1,
      through
    );
    const recurrencePositions = new Set(
      recurrences.map((recurrence) => recurrence.targetReelPosition)
    );
    while (recurrencePositions.has(materializedThrough + 1)) {
      materializedThrough += 1;
    }
    return materializedThrough;
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
