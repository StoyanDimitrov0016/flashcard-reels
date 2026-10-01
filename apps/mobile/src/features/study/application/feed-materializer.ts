import type { DeckId } from "@/features/decks/domain/deck.model";
import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";
import type { FlashcardMemoryState } from "@/features/learning-engine/domain/flashcard-memory-state";
import type { FlashcardMemoryStateRepository } from "@/features/learning-engine/domain/flashcard-memory-state.repository";
import type { LearningScheduler } from "@/features/learning-engine/domain/learning-scheduler";
import type { StudySessionFeedTransaction } from "@/features/study/application/study-session-feed.transaction";
import type { StudySessionOperations } from "@/features/study/application/study-session-operations";
import type {
  PreparedReelFeed,
  PreparedReelOccurrence,
  PreparedReelOccurrences,
} from "@/features/study/domain/study-feed";
import type { StudySessionRecurrence } from "@/features/study/domain/study-session-recurrence.model";
import type { StudySessionRecurrenceRepository } from "@/features/study/domain/study-session-recurrence.repository";
import type { StudySessionReelRepository } from "@/features/study/domain/study-session-reel.repository";
import type { StudySessionScope } from "@/features/study/domain/study-session.model";
import type { StudySessionRepository } from "@/features/study/domain/study-session.repository";
import type { Clock } from "@/shared/domain/clock";
import type { IdGenerator } from "@/shared/domain/id-generator";

import {
  rememberCard,
  type FeedCandidate,
  type FeedComposer,
  type FeedState,
} from "@/features/learning-engine/domain/feed-composer";
import { FeedStateSchema } from "@/features/study/contracts/feed-state.schema";
import { FEED_ENGINE_CONFIG } from "@/features/study/domain/feed-engine";
import { StudySessionReel } from "@/features/study/domain/study-session-reel.model";
import { OperationError } from "@/shared/errors/operation-error";
import { reportError } from "@/shared/errors/report-error";

export class FeedMaterializer {
  private readonly studyService: Pick<StudySessionOperations, "openSession">;
  private readonly memoryStateRepository: FlashcardMemoryStateRepository;
  private readonly scheduler: LearningScheduler;
  private readonly clock: Clock;
  private readonly feedComposer: FeedComposer;

  private readonly sessions: StudySessionRepository;
  private readonly reels: StudySessionReelRepository;
  private readonly recurrences: StudySessionRecurrenceRepository;
  private readonly feedTransaction: StudySessionFeedTransaction;
  private readonly ids: IdGenerator;
  constructor(
    studyService: Pick<StudySessionOperations, "openSession">,
    memoryStateRepository: FlashcardMemoryStateRepository,
    scheduler: LearningScheduler,
    clock: Clock,
    feedComposer: FeedComposer,
    sessions: StudySessionRepository,
    reels: StudySessionReelRepository,
    recurrences: StudySessionRecurrenceRepository,
    feedTransaction: StudySessionFeedTransaction,
    ids: IdGenerator
  ) {
    this.sessions = sessions;
    this.reels = reels;
    this.recurrences = recurrences;
    this.feedTransaction = feedTransaction;
    this.ids = ids;
    this.studyService = studyService;
    this.memoryStateRepository = memoryStateRepository;
    this.scheduler = scheduler;
    this.clock = clock;
    this.feedComposer = feedComposer;
  }

  async prepareFeed(
    cards: readonly Flashcard[],
    scope: StudySessionScope,
    deckId: DeckId | null,
    replaceExistingSession: boolean,
    anchorFlashcardId: string | null
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
    const session = await this.requireSession(studySessionId);
    await this.ensureMaterialized(
      cards,
      session,
      FEED_ENGINE_CONFIG.futureWindowSize + FEED_ENGINE_CONFIG.materializationBatchSize
    );
    return this.buildPreparedFeed(cards, session);
  }

  async recordVisibleCard(studySessionId: string, flashcardId: string): Promise<void> {
    const session = await this.requireSession(studySessionId);
    const currentState = parseFeedState(session.feedState);
    const nextState = rememberCard(currentState, flashcardId);
    await this.feedTransaction.updateState(studySessionId, JSON.stringify(nextState));
  }

  async refreshFeed(
    sourceCards: readonly Flashcard[],
    studySessionId: string
  ): Promise<PreparedReelFeed> {
    const session = await this.requireSession(studySessionId);
    return this.buildPreparedFeed(sourceCards, session);
  }

  private async requireSession(studySessionId: string) {
    const session = await this.sessions.findById(studySessionId);
    if (!session || session.completedAt !== null) {
      throw new OperationError({
        code: "STUDY_SESSION_ENDED",
        context: { studySessionId },
        message: `Missing study session ${studySessionId}`,
      });
    }
    return session;
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
    const targetPosition = leadingReelPosition(session) + additionalWindow;
    const candidates = await this.buildCandidates(sourceCards, session);
    const feedState = parseFeedState(session.feedState);
    await this.materializeUntilTarget(
      session,
      targetPosition,
      candidates,
      feedState,
      anchorFlashcardId
    );
  }

  private async materializeUntilTarget(
    session: Readonly<{ id: string }>,
    targetPosition: number,
    candidates: readonly FeedCandidate[],
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
      selectionFeedState,
      anchorFlashcardId
    );
    if (nextState) {
      await this.materializeUntilTarget(
        session,
        targetPosition,
        candidates,
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
      await this.recurrences.listPendingCardIdsFromTarget(session.id, session.furthestReelPosition)
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
    initialSelectionState: FeedState,
    anchorFlashcardId: string | null
  ): Promise<FeedState | null> {
    const batchCards: Flashcard[] = [];
    const batchReelPositions: number[] = [];
    let selectionFeedState = initialSelectionState;
    let nextReelPosition = ((await this.reels.findMaxReelPosition(session.id)) ?? -1) + 1;
    const reservedRecurrences = await this.recurrences.listBySessionIdInTargetRange(
      session.id,
      nextReelPosition,
      targetPosition
    );
    const occupiedRecurrencePositions = new Set(
      reservedRecurrences.map((recurrence) => recurrence.targetReelPosition)
    );
    const baseFeedPositionStart =
      ((await this.reels.findMaxBaseFeedPosition(session.id)) ?? -1) + 1;
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

    await this.feedTransaction.append(
      session.id,
      batchCards.map(
        (card, index) =>
          new StudySessionReel({
            id: this.ids.generate(),
            flashcardId: card.id,
            studySessionId: session.id,
            baseFeedPosition: baseFeedPositionStart + index,
            reelPosition: batchReelPositions[index] ?? 0,
          })
      )
    );
    return selectionFeedState;
  }

  private async buildPreparedFeed(
    sourceCards: readonly Flashcard[],
    session: Readonly<{ currentReelPosition: number; furthestReelPosition: number; id: string }>
  ): Promise<PreparedReelFeed> {
    const materializedThrough = await this.findMaterializedThrough(
      session.id,
      leadingReelPosition(session) + FEED_ENGINE_CONFIG.futureWindowSize
    );
    const loadedFromReelPosition = Math.max(
      0,
      session.currentReelPosition - FEED_ENGINE_CONFIG.pastWindowSize
    );
    const loadedThroughReelPosition = Math.min(
      session.currentReelPosition + FEED_ENGINE_CONFIG.futureWindowSize,
      materializedThrough
    );
    let items: StudySessionReel[] = [];
    let recurrences: StudySessionRecurrence[] = [];
    if (loadedFromReelPosition <= loadedThroughReelPosition) {
      items = await this.reels.listBySessionIdInReelPositionRange(
        session.id,
        loadedFromReelPosition,
        loadedThroughReelPosition
      );
      recurrences = await this.recurrences.listBySessionIdInTargetRange(
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
    items: readonly StudySessionReel[],
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
    let materializedThrough = (await this.reels.findMaxReelPosition(studySessionId)) ?? -1;
    if (materializedThrough >= through) {
      return materializedThrough;
    }
    const recurrences = await this.recurrences.listBySessionIdInTargetRange(
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
  // New sessions persist this empty sentinel before a card has been shown.
  if (rawState === "{}") {
    return { recentCardIds: [] };
  }
  try {
    const parsed = FeedStateSchema.safeParse(JSON.parse(rawState));
    if (parsed.success) {
      return parsed.data;
    }
    reportError(parsed.error, "Invalid persisted feed state");
    return { recentCardIds: [] };
  } catch (cause) {
    reportError(cause, "Invalid persisted feed state");
    return { recentCardIds: [] };
  }
}

function toCandidate(
  card: Flashcard,
  memoryState: FlashcardMemoryState | null,
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

function leadingReelPosition(
  session: Readonly<{ currentReelPosition: number; furthestReelPosition: number }>
): number {
  return Math.max(session.currentReelPosition, session.furthestReelPosition);
}
