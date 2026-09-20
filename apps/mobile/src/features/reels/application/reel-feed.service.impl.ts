import { createFeedComposer } from "@/features/learning-engine/application/learning-engine-factories";
import {
  rememberCard,
  type FeedCandidate,
  type FeedState,
} from "@/features/learning-engine/domain/feed-composer";
import type { FlashcardMemoryStateRepository } from "@/features/learning-engine/domain/flashcard-memory-state.repository";
import type { LearnerMemoryState } from "@/features/learning-engine/domain/memory-state";
import type { LearningScheduler } from "@/features/learning-engine/domain/learning-scheduler";
import type { DeckId } from "@/features/decks/domain/deck.model";
import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";
import { FeedStateSchema } from "@/features/reels/contracts/feed-state.schema";
import { FEED_ENGINE_CONFIG } from "@/features/reels/domain/feed-engine";
import type {
  PreparedReelFeed,
  PreparedReelOccurrence,
  PreparedReelOccurrences,
} from "@/features/reels/domain/reel-feed";
import type { ReelFeedService } from "@/features/reels/domain/reel-feed.service";
import type { StudySessionRecurrence } from "@/features/study/domain/study-session-recurrence.model";
import type { StudySessionScope } from "@/features/study/domain/study-session.model";
import type { StudySessionItem } from "@/features/study/domain/study-session-item.model";
import type { StudyService } from "@/features/study/domain/study.service";
import type { Clock } from "@/shared/domain/clock";

type RandomSource = () => number;

export class ReelFeedServiceImpl implements ReelFeedService {
  private readonly studyService: StudyService;
  private readonly memoryStateRepository: FlashcardMemoryStateRepository;
  private readonly scheduler: LearningScheduler;
  private readonly clock: Clock;
  private readonly feedComposer: ReturnType<typeof createFeedComposer>;

  constructor(
    studyService: StudyService,
    memoryStateRepository: FlashcardMemoryStateRepository,
    scheduler: LearningScheduler,
    clock: Clock,
    random: RandomSource = Math.random
  ) {
    this.studyService = studyService;
    this.memoryStateRepository = memoryStateRepository;
    this.scheduler = scheduler;
    this.clock = clock;
    this.feedComposer = createFeedComposer(random);
  }

  async prepareFeed(
    cards: readonly Flashcard[],
    scope: StudySessionScope,
    deckId: DeckId | null,
    replaceExistingSession: boolean,
    anchorFlashcardId: string | null = null
  ): Promise<PreparedReelFeed> {
    const openedSession = await this.studyService.openSession(
      scope,
      deckId,
      replaceExistingSession
    );

    await this.ensureMaterialized(
      cards,
      openedSession.session,
      FEED_ENGINE_CONFIG.futureWindowSize,
      anchorFlashcardId
    );
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

  async recordVisibleCard(studySessionId: string, flashcardId: string): Promise<void> {
    const session = await this.studyService.findSession(studySessionId);
    if (!session) {
      throw new Error(`Missing study session ${studySessionId}`);
    }
    const currentState = parseFeedState(session.feedState);
    const nextState = rememberCard(currentState, flashcardId);
    await this.studyService.updateSessionFeedState(studySessionId, JSON.stringify(nextState));
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
      furthestReelPosition: number;
      feedState: string;
      id: string;
    }>,
    additionalWindow: number = FEED_ENGINE_CONFIG.futureWindowSize,
    anchorFlashcardId: string | null = null
  ): Promise<void> {
    const targetPosition =
      Math.max(session.currentReelPosition, session.furthestReelPosition) + additionalWindow;
    const candidates = await this.buildCandidates(sourceCards, session);
    const feedState = parseFeedState(session.feedState);
    await this.materializeUntilTarget(
      session,
      targetPosition,
      candidates,
      feedState,
      feedState,
      anchorFlashcardId
    );
  }

  private async materializeUntilTarget(
    session: Readonly<{ id: string }>,
    targetPosition: number,
    candidates: readonly FeedCandidate[],
    persistedFeedState: FeedState,
    selectionFeedState: FeedState,
    anchorFlashcardId: string | null
  ): Promise<void> {
    const materializedThrough = await this.findMaterializedThrough(session.id, targetPosition);
    if (materializedThrough >= targetPosition) {
      return;
    }

    const nextState = await this.materializeBatch(
      session,
      targetPosition,
      candidates,
      persistedFeedState,
      selectionFeedState,
      anchorFlashcardId
    );
    if (nextState) {
      await this.materializeUntilTarget(
        session,
        targetPosition,
        candidates,
        persistedFeedState,
        nextState,
        anchorFlashcardId
      );
    }
  }

  private async buildCandidates(
    sourceCards: readonly Flashcard[],
    session: Readonly<{ furthestReelPosition: number; id: string }>
  ): Promise<FeedCandidate[]> {
    const activeCards = sourceCards.filter((card) => card.active);
    const memoryStates = await this.memoryStateRepository.findByFlashcardIds(
      activeCards.map((card) => card.id)
    );
    const pendingRecurrenceCardIds = new Set(
      await this.studyService.listPendingRecurrenceFlashcardIdsFromTargetPosition(
        session.id,
        session.furthestReelPosition
      )
    );
    const now = this.clock.now();

    return activeCards.map((card) =>
      toCandidate(
        card,
        memoryStates.get(card.id) ?? null,
        pendingRecurrenceCardIds,
        this.scheduler,
        now
      )
    );
  }

  private async materializeBatch(
    session: Readonly<{ id: string }>,
    targetPosition: number,
    candidates: readonly FeedCandidate[],
    persistedFeedState: FeedState,
    initialSelectionState: FeedState,
    anchorFlashcardId: string | null
  ): Promise<FeedState | null> {
    const batchCards: Flashcard[] = [];
    const batchReelPositions: number[] = [];
    let selectionFeedState = initialSelectionState;
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
    const anchorCandidate = candidates.filter(
      (candidate) => candidate.card.id === anchorFlashcardId
    );
    const shouldAnchor = anchorFlashcardId !== null && baseFeedPositionStart === 0;

    while (
      nextReelPosition <= targetPosition &&
      batchCards.length < FEED_ENGINE_CONFIG.materializationBatchSize
    ) {
      if (occupiedRecurrencePositions.has(nextReelPosition)) {
        nextReelPosition += 1;
        continue;
      }

      const choice = this.feedComposer.chooseNext({
        candidates: shouldAnchor && batchCards.length === 0 ? anchorCandidate : candidates,
        state: selectionFeedState,
      });
      if (!choice) {
        break;
      }
      batchCards.push(choice.candidate.card);
      batchReelPositions.push(nextReelPosition);
      nextReelPosition += 1;
      selectionFeedState = choice.state;
    }

    if (batchCards.length === 0) {
      return null;
    }

    await this.studyService.appendSessionItems(
      session.id,
      batchCards,
      JSON.stringify(persistedFeedState),
      baseFeedPositionStart,
      batchReelPositions
    );
    return selectionFeedState;
  }

  private async buildPreparedFeed(
    sourceCards: readonly Flashcard[],
    session: Readonly<{ currentReelPosition: number; furthestReelPosition: number; id: string }>
  ): Promise<PreparedReelFeed> {
    const materializedThrough = await this.findMaterializedThrough(
      session.id,
      Math.max(session.currentReelPosition, session.furthestReelPosition) +
        FEED_ENGINE_CONFIG.futureWindowSize
    );
    const loadedFromReelPosition = Math.max(
      0,
      session.currentReelPosition - FEED_ENGINE_CONFIG.pastWindowSize
    );
    const loadedThroughReelPosition = Math.min(
      session.currentReelPosition + FEED_ENGINE_CONFIG.futureWindowSize,
      materializedThrough
    );
    let items: StudySessionItem[] = [];
    let recurrences: StudySessionRecurrence[] = [];
    if (loadedFromReelPosition <= loadedThroughReelPosition) {
      items = await this.studyService.listSessionItemsInReelPositionRange(
        session.id,
        loadedFromReelPosition,
        loadedThroughReelPosition
      );
      recurrences = await this.studyService.listSessionRecurrencesInTargetRange(
        session.id,
        loadedFromReelPosition,
        loadedThroughReelPosition
      );
    }
    const occurrences = this.mergeMaterializedReels(
      items,
      recurrences,
      new Map(sourceCards.map((card) => [card.id, card])),
      loadedFromReelPosition,
      loadedThroughReelPosition
    );

    return {
      currentReelPosition: session.currentReelPosition,
      furthestReelPosition: session.furthestReelPosition,
      loadedFromReelPosition,
      loadedThroughReelPosition,
      materializedThroughReelPosition: materializedThrough,
      occurrences,
      studySessionId: session.id,
    };
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
}

function parseFeedState(rawState: string): FeedState {
  try {
    const parsed = FeedStateSchema.safeParse(JSON.parse(rawState));
    return parsed.success ? parsed.data : { recentCardIds: [] };
  } catch {
    return { recentCardIds: [] };
  }
}

function toCandidate(
  card: Flashcard,
  memoryState: LearnerMemoryState | null,
  pendingRecurrenceCardIds: ReadonlySet<string>,
  scheduler: LearningScheduler,
  now: string
): FeedCandidate {
  const retrievability = memoryState ? scheduler.retrievability(memoryState, now) : null;
  const dueAt = memoryState?.dueAt ?? null;
  return {
    card,
    dueAt,
    isDue: dueAt !== null && Date.parse(dueAt) <= Date.parse(now),
    isNew: memoryState === null,
    isReservedForImmediateRecurrence: pendingRecurrenceCardIds.has(card.id),
    memoryState,
    retrievability,
  };
}
