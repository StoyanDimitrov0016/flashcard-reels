import type { Rating } from "@/features/learning-engine/domain/rating";
import type { FeedMaterializer } from "@/features/study/application/feed-materializer";
import type { StudySessionOperations } from "@/features/study/application/study-session-operations";
import type {
  DeckChange,
  StudySessionSettlement,
} from "@/features/study/application/study-session-settlement";
import type { ReviewAttemptRepository } from "@/features/study/domain/review-attempt.repository";
import type { StudySessionRecurrenceRepository } from "@/features/study/domain/study-session-recurrence.repository";
import type { StudySessionReelRepository } from "@/features/study/domain/study-session-reel.repository";
import type { StudySessionRepository } from "@/features/study/domain/study-session.repository";
import type {
  ActivationResult,
  CardInput,
  FeedInput,
  OpenFeedInput,
  RateCardResult,
  StudyFeedService,
  StudyFeedSnapshot,
} from "@/features/study/domain/study.service";
import type { Clock } from "@/shared/domain/clock";

import { shouldExtendReelFeed } from "@/features/study/application/feed-extension-policy";
import { shouldCompactSessionRuntimeData } from "@/features/study/application/feed-position-extension";
import { doesRatingRecur } from "@/features/study/domain/recurrences";
import { getFirstEditableReelPosition } from "@/features/study/domain/review-attempts";
import { AppError } from "@/shared/errors/app-error";
import { OperationError } from "@/shared/errors/operation-error";

type StudyServiceOptions = Readonly<{
  operations: StudySessionOperations;
  materializer: FeedMaterializer;
  attempts: ReviewAttemptRepository;
  sessions: StudySessionRepository;
  reels: StudySessionReelRepository;
  recurrences: StudySessionRecurrenceRepository;
  clock: Clock;
}>;

export class StudyServiceImpl implements StudyFeedService, StudySessionSettlement {
  private readonly options: StudyServiceOptions;

  constructor(options: StudyServiceOptions) {
    this.options = options;
  }

  async openFeed(input: OpenFeedInput): Promise<StudyFeedSnapshot> {
    const feed = await this.options.materializer.prepareFeed(
      input.cards,
      input.scope,
      input.deckId,
      input.replaceExisting,
      input.anchorFlashcardId
    );
    return this.snapshot(feed);
  }

  async activateCard(input: CardInput): Promise<ActivationResult> {
    const { operations, sessions, recurrences, attempts, clock, materializer } = this.options;
    const changed = await operations.serializeSession(input.sessionId, async () => {
      const before = await this.requireSession(input.sessionId);
      const occurrence = await this.occurrence(input);
      await operations.startAttempt(occurrence.cardId, input.reelPosition, input.sessionId);
      const position = await sessions.updateCurrentReelPosition(
        input.sessionId,
        input.reelPosition,
        clock.now()
      );
      if (!position) {
        throw new OperationError({
          code: "STUDY_PERSISTENCE_FAILED",
          message: "The current study position could not be saved",
        });
      }
      const consumed = occurrence.recurrenceId
        ? await recurrences.markConsumed(occurrence.recurrenceId, clock.now())
        : false;
      await materializer.recordVisibleCard(input.sessionId, occurrence.cardId);
      const pending = await attempts.listUncommittedBeforeReelPosition(
        input.sessionId,
        getFirstEditableReelPosition(position.furthestReelPosition)
      );
      await operations.commitOutsideWindow(input.sessionId);
      if (
        shouldCompactSessionRuntimeData(before.furthestReelPosition, position.furthestReelPosition)
      ) {
        await operations.compactSessionRuntimeData(input.sessionId, position.furthestReelPosition);
      }
      const through =
        input.loadedThroughReelPosition ??
        (await this.options.reels.findMaxReelPosition(input.sessionId)) ??
        -1;
      return {
        snapshotNeeded: consumed || pending.some((attempt) => doesRatingRecur(attempt.rating)),
        extend: shouldExtendReelFeed(input.reelPosition, through + 1),
      };
    });
    // Slow materialization runs after the one session queue releases rating and commit work.
    if (changed.extend) {
      try {
        return { snapshot: await this.extendFeed(input), extensionError: null };
      } catch (error) {
        return {
          snapshot: changed.snapshotNeeded ? await this.refreshFeed(input) : null,
          extensionError: error instanceof Error ? error : new Error(String(error)),
        };
      }
    }
    return {
      snapshot: changed.snapshotNeeded ? await this.refreshFeed(input) : null,
      extensionError: null,
    };
  }

  async rateCard(
    input: CardInput & Readonly<{ rating: Rating; expectedAttempt?: boolean }>
  ): Promise<RateCardResult> {
    const { operations, attempts } = this.options;
    const saved = await operations.serializeSession(input.sessionId, async () => {
      await this.requireSession(input.sessionId);
      const existing = await attempts.findBySessionAndReelPosition(
        input.sessionId,
        input.reelPosition
      );
      if (!existing && input.expectedAttempt) {
        throw new OperationError({
          code: "STUDY_PERSISTENCE_FAILED",
          message: "The selected rating could not be saved",
        });
      }
      const occurrence = await this.occurrence(input);
      const id =
        existing?.id ??
        (await operations.startAttempt(occurrence.cardId, input.reelPosition, input.sessionId));
      const result = await operations.rateAttempt(id, input.rating);
      if (result.status === "missing") {
        await this.requireSession(input.sessionId);
        throw new OperationError({
          code: "STUDY_PERSISTENCE_FAILED",
          message: "The selected rating could not be saved",
        });
      }
      return {
        status: result.status,
        rating: result.status === "locked" ? result.rating : input.rating,
        snapshotNeeded: doesRatingRecur(existing?.rating ?? null) || doesRatingRecur(input.rating),
      };
    });
    if (!saved.snapshotNeeded) {
      return { status: saved.status, rating: saved.rating, snapshot: null };
    }
    try {
      return {
        status: saved.status,
        rating: saved.rating,
        snapshot: await this.refreshFeed(input),
      };
    } catch (cause) {
      if (cause instanceof AppError && cause.code === "STUDY_SESSION_ENDED") {
        throw cause;
      }
      throw new OperationError({
        code: "VIEW_LOAD_FAILED",
        message: "The feed could not be refreshed",
        context: { operation: "rated-feed.refresh", status: saved.status },
        cause,
      });
    }
  }

  async extendFeed(input: FeedInput): Promise<StudyFeedSnapshot> {
    return this.options.operations.serializeSession("feed:" + input.sessionId, async () => {
      await this.requireSession(input.sessionId);
      return this.snapshot(
        await this.options.materializer.extendFeed(input.cards, input.sessionId)
      );
    });
  }

  async refreshFeed(input: FeedInput): Promise<StudyFeedSnapshot> {
    await this.requireSession(input.sessionId);
    return this.snapshot(await this.options.materializer.refreshFeed(input.cards, input.sessionId));
  }

  async resumeFocusedSession() {
    return this.options.operations.resumeFocusedSession();
  }

  async settleDeckChange(change: DeckChange): Promise<void> {
    if (change.kind === "remove") {
      await this.options.operations.settleBeforeDeckRemoval(change.deckId);
    } else {
      await this.options.operations.settleActiveSessionsAffectedByDeck(
        change.deckId,
        change.kind !== "first-install"
      );
    }
  }

  async settleForProgressBackup(): Promise<void> {
    await this.options.operations.settleForProgressBackup();
  }

  private async requireSession(id: string) {
    const session = await this.options.sessions.findById(id);
    if (!session || session.completedAt !== null) {
      throw new OperationError({
        code: "STUDY_SESSION_ENDED",
        message: "The study session has ended",
      });
    }
    return session;
  }

  private async occurrence(input: CardInput) {
    const { reels, recurrences } = this.options;
    const items = await reels.listBySessionIdInReelPositionRange(
      input.sessionId,
      input.reelPosition,
      input.reelPosition
    );
    const returns = await recurrences.listBySessionIdInTargetRange(
      input.sessionId,
      input.reelPosition,
      input.reelPosition
    );
    const recurrence = returns[0];
    const cardId = items[0]?.flashcardId ?? recurrence?.flashcardId;
    if (!cardId || !input.cards.some((card) => card.id === cardId)) {
      throw new Error(`Missing flashcard at reel ${input.reelPosition}`);
    }
    return { cardId, recurrenceId: recurrence?.consumedAt === null ? recurrence.id : null };
  }

  private async snapshot(feed: StudyFeedSnapshot["feed"]): Promise<StudyFeedSnapshot> {
    const attempts = await this.options.attempts.listBySessionAndReelPositionRange(
      feed.studySessionId,
      feed.loadedFromReelPosition,
      feed.loadedThroughReelPosition
    );
    const ratings = new Map<number, Rating>();
    for (const attempt of attempts) {
      if (attempt.rating !== null) {
        ratings.set(attempt.reelPosition, attempt.rating);
      }
    }
    return { feed, ratings };
  }
}
