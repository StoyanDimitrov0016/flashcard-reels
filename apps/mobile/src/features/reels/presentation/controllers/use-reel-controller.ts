import { useCallback, useEffect, useRef, useState } from "react";

import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";
import type { Rating } from "@/features/learning-engine/domain/rating";
import type { PreparedReelFeed, PreparedReelOccurrence } from "@/features/reels/domain/reel-feed";
import type { FocusedCardState } from "@/features/reels/presentation/open-focused-feed";

import { useLearningProgressRevision } from "@/features/flashcard-progress/presentation/context/learning-progress-revision-context";
import { shouldExtendReelFeed } from "@/features/reels/application/reel-extension-policy";
import {
  completeReelActivation,
  shouldCompactSessionRuntimeData,
} from "@/features/reels/application/reel-position-extension";
import { useReels } from "@/features/reels/presentation/dependencies/use-reels";
import { useRecallSession } from "@/features/reels/presentation/hooks/use-recall-session";
import { mergeMountedReelOccurrences } from "@/features/reels/presentation/mounted-reel-occurrences";
import { hasRecurrence } from "@/features/study/domain/recurrences";
import { AppError } from "@/shared/errors/app-error";
import { toOperationError } from "@/shared/errors/normalize-error";
import { OperationError } from "@/shared/errors/operation-error";
import { reportError } from "@/shared/errors/report-error";
import { showErrorToast } from "@/shared/presentation/flashcard-toast";

type ReelControllerOptions = Readonly<{
  initialFeed: PreparedReelFeed;
  sourceCards: readonly Flashcard[];
  initialCardState?: FocusedCardState;
}>;

export function useReelController({
  initialCardState,
  initialFeed,
  sourceCards,
}: ReelControllerOptions) {
  const { reelFeedService, studyService } = useReels();
  const { invalidateLearningProgress } = useLearningProgressRevision();
  const sessionEnded = useRef(false);
  const feedbackActive = useRef(true);
  useEffect(function ownRatingFeedbackLifetime() {
    feedbackActive.current = true;
    return function stopRatingFeedbackOnUnmount() {
      feedbackActive.current = false;
    };
  }, []);
  const [feed, setFeed] = useState(initialFeed);
  const feedReference = useRef(initialFeed);
  const sourceCardsReference = useRef(sourceCards);
  useEffect(
    function synchronizeSourceCards() {
      sourceCardsReference.current = sourceCards;
    },
    [sourceCards]
  );
  const activationQueue = useRef(Promise.resolve());
  const feedLoadSequence = useRef(0);
  const startingAttemptPromises = useRef(new Map<number, Promise<string>>());
  const pendingRatingPromises = useRef(new Set<Promise<void>>());
  const extensionInFlight = useRef<Promise<void> | null>(null);
  const criticalFailureReference = useRef<Error | null>(null);
  const [fatalError, setFatalError] = useState<Error | null>(null);
  const [extensionError, setExtensionError] = useState<Error | null>(null);
  const [refreshError, setRefreshError] = useState<Error | null>(null);
  const initialRecallState = initialCardState
    ? {
        position:
          initialFeed.occurrences.find(({ card }) => card.id === initialCardState.cardId)
            ?.reelPosition ?? initialFeed.currentReelPosition,
        rating: initialCardState.rating,
        revealed: initialCardState.revealed,
      }
    : undefined;
  const recordCriticalFailure = useCallback(
    (error: unknown): Error => {
      if (error instanceof AppError && error.code === "STUDY_SESSION_ENDED") {
        if (!sessionEnded.current) {
          sessionEnded.current = true;
          invalidateLearningProgress();
        }
        return error;
      }
      const normalized = toOperationError(error, {
        code: "STUDY_PERSISTENCE_FAILED",
        context: { operation: "study-persistence" },
        message: "Study progress could not be saved",
      });
      if (!criticalFailureReference.current) {
        criticalFailureReference.current = normalized;
        setFatalError(normalized);
      }
      return criticalFailureReference.current;
    },
    [invalidateLearningProgress]
  );

  const recallSession = useRecallSession(
    studyService,
    initialFeed.studySessionId,
    feed.loadedFromReelPosition,
    feed.loadedThroughReelPosition,
    initialRecallState,
    recordCriticalFailure
  );
  const { getAttemptId, getRating, rateCard, setAttemptId } = recallSession;

  const replaceFeed = useCallback((nextFeed: PreparedReelFeed) => {
    const occurrences = mergeMountedReelOccurrences(
      feedReference.current.occurrences,
      nextFeed.occurrences,
      {
        currentReelPosition: nextFeed.currentReelPosition,
        furthestReelPosition: nextFeed.furthestReelPosition,
      }
    );
    const mountedFeed = {
      ...nextFeed,
      loadedFromReelPosition: occurrences[0]?.reelPosition ?? nextFeed.loadedFromReelPosition,
      loadedThroughReelPosition:
        occurrences.at(-1)?.reelPosition ?? nextFeed.loadedThroughReelPosition,
      occurrences,
    };
    feedReference.current = mountedFeed;
    setFeed(mountedFeed);
  }, []);

  const startAttempt = useCallback(
    (occurrence: PreparedReelOccurrence): Promise<string> => {
      const existingAttemptId = getAttemptId(occurrence.reelPosition);
      if (existingAttemptId) {
        return Promise.resolve(existingAttemptId);
      }

      const existingStart = startingAttemptPromises.current.get(occurrence.reelPosition);
      if (existingStart) {
        return existingStart;
      }

      const start = studyService
        .startAttempt(occurrence.card.id, occurrence.reelPosition, initialFeed.studySessionId)
        .then((attemptId) => {
          setAttemptId(occurrence.reelPosition, attemptId);
          return attemptId;
        })
        .catch((error: unknown) => {
          recordCriticalFailure(error);
          throw error;
        });
      startingAttemptPromises.current.set(occurrence.reelPosition, start);
      void start
        .finally(() => startingAttemptPromises.current.delete(occurrence.reelPosition))
        .catch(() => undefined);
      return start;
    },
    [getAttemptId, initialFeed.studySessionId, recordCriticalFailure, setAttemptId, studyService]
  );

  const requestFeedExtension = useCallback(() => {
    if (extensionInFlight.current) {
      return extensionInFlight.current;
    }
    const sequence = ++feedLoadSequence.current;
    const extension = Promise.resolve()
      .then(() =>
        reelFeedService.extendFeed(sourceCardsReference.current, initialFeed.studySessionId)
      )
      .then((nextFeed) => {
        if (sequence !== feedLoadSequence.current) {
          return;
        }
        replaceFeed(nextFeed);
        setExtensionError(null);
      });
    const trackedExtension = extension
      .catch((error: unknown) => {
        if (sequence !== feedLoadSequence.current) {
          return;
        }
        if (error instanceof AppError && error.code === "STUDY_SESSION_ENDED") {
          recordCriticalFailure(error);
          return;
        }
        const normalized = toOperationError(error, {
          code: "FEED_EXTENSION_FAILED",
          context: { operation: "reel-feed.extend" },
          message: "More cards could not be loaded",
        });
        reportError(normalized, "Feed extension failure");
        setExtensionError(normalized);
        throw normalized;
      })
      .finally(() => {
        if (extensionInFlight.current === trackedExtension) {
          extensionInFlight.current = null;
        }
      });
    extensionInFlight.current = trackedExtension;
    return trackedExtension;
  }, [initialFeed.studySessionId, reelFeedService, replaceFeed, recordCriticalFailure]);

  const awaitPendingRatings = useCallback(async () => {
    const outcomes = await Promise.allSettled(pendingRatingPromises.current);
    const rejected = outcomes.find(
      (outcome): outcome is PromiseRejectedResult => outcome.status === "rejected"
    );
    if (rejected) {
      throw recordCriticalFailure(rejected.reason);
    }
    if (criticalFailureReference.current) {
      throw criticalFailureReference.current;
    }
  }, [recordCriticalFailure]);

  const refreshFeed = useCallback(async () => {
    const sequence = ++feedLoadSequence.current;
    try {
      const nextFeed = await reelFeedService.refreshFeed(
        sourceCardsReference.current,
        initialFeed.studySessionId
      );
      if (sequence !== feedLoadSequence.current) {
        return;
      }
      replaceFeed(nextFeed);
      setRefreshError(null);
    } catch (error) {
      if (sequence !== feedLoadSequence.current) {
        return;
      }
      if (error instanceof AppError && error.code === "STUDY_SESSION_ENDED") {
        recordCriticalFailure(error);
        return;
      }
      const normalized = toOperationError(error, {
        code: "VIEW_LOAD_FAILED",
        context: { operation: "reel-feed.refresh" },
        message: "The feed could not be refreshed",
      });
      setRefreshError(normalized);
      reportError(normalized, "Feed refresh failure");
    }
  }, [initialFeed.studySessionId, reelFeedService, replaceFeed, recordCriticalFailure]);

  const retryFeedExtension = useCallback(() => {
    setExtensionError(null);
    void requestFeedExtension().catch(() => undefined);
  }, [requestFeedExtension]);

  const onOccurrenceBecameActive = useCallback(
    (reelPosition: number) => {
      if (criticalFailureReference.current || sessionEnded.current) {
        return;
      }
      const occurrence = feedReference.current.occurrences.find(
        (current) => current.reelPosition === reelPosition
      );
      if (!occurrence) {
        return;
      }

      const currentFeed = feedReference.current;
      const localIndex = currentFeed.occurrences.findIndex(
        (current) => current.key === occurrence.key
      );
      const shouldExtend = shouldExtendReelFeed(localIndex, currentFeed.occurrences.length);

      const activation = activationQueue.current.then(async () => {
        let compactionPosition: number | null = null;
        await startAttempt(occurrence);
        await completeReelActivation(
          async () => {
            const previousFurthestReelPosition = feedReference.current.furthestReelPosition;
            const position = await studyService.updateSessionReelPosition(
              initialFeed.studySessionId,
              occurrence.reelPosition
            );
            if (!position) {
              throw new OperationError({
                code: "STUDY_PERSISTENCE_FAILED",
                context: { operation: "study-session.update-position" },
                message: "The current study position could not be saved",
              });
            }
            const nextFeed = {
              ...feedReference.current,
              currentReelPosition: position.currentReelPosition,
              furthestReelPosition: position.furthestReelPosition,
            };
            feedReference.current = nextFeed;
            setFeed(nextFeed);
            if (
              shouldCompactSessionRuntimeData(
                previousFurthestReelPosition,
                position.furthestReelPosition
              )
            ) {
              compactionPosition = position.furthestReelPosition;
            }
            return true;
          },
          async () => {
            if (occurrence.recurrenceId) {
              await studyService.consumeRecurrence(occurrence.recurrenceId);
            }
          },
          () => reelFeedService.recordVisibleCard(initialFeed.studySessionId, occurrence.card.id),
          () => studyService.commitAttemptsOutsideEditableWindow(initialFeed.studySessionId),
          () =>
            compactionPosition === null
              ? Promise.resolve()
              : studyService.compactSessionRuntimeData(
                  initialFeed.studySessionId,
                  compactionPosition
                ),
          () => (shouldExtend ? requestFeedExtension().catch(() => undefined) : Promise.resolve()),
          awaitPendingRatings
        );
      });
      activationQueue.current = activation.catch((error: unknown) => {
        recordCriticalFailure(error);
      });
      void activationQueue.current;
    },
    [
      awaitPendingRatings,
      initialFeed.studySessionId,
      requestFeedExtension,
      reelFeedService,
      recordCriticalFailure,
      startAttempt,
      studyService,
    ]
  );

  const onRatingSelected = useCallback(
    (occurrence: PreparedReelOccurrence, rating: Rating) => {
      if (criticalFailureReference.current || sessionEnded.current) {
        return;
      }
      const previousRating = getRating(occurrence.reelPosition);
      const ratingPersistence = startAttempt(occurrence)
        .then((attemptId) => studyService.rateAttempt(attemptId, rating))
        .then(async (updated) => {
          if (updated.status === "locked") {
            if (updated.rating !== null) {
              rateCard(occurrence.reelPosition, updated.rating);
            }
            if (feedbackActive.current) {
              showErrorToast("This rating is already saved.");
            }
            return;
          }
          if (updated.status === "missing") {
            const session = await studyService.findSession(initialFeed.studySessionId);
            if (!session || session.completedAt !== null) {
              throw new OperationError({
                code: "STUDY_SESSION_ENDED",
                message: "The study session has ended",
              });
            }
            throw new OperationError({
              code: "STUDY_PERSISTENCE_FAILED",
              context: { operation: "study-attempt.rate" },
              message: "The selected rating could not be saved",
            });
          }
          rateCard(occurrence.reelPosition, rating);
          if (hasRecurrence(previousRating) || hasRecurrence(rating)) {
            void refreshFeed();
          }
        })
        .catch((error: unknown) => {
          recordCriticalFailure(error);
          if (!(error instanceof AppError && error.code === "STUDY_SESSION_ENDED")) {
            throw error;
          }
        });
      pendingRatingPromises.current.add(ratingPersistence);
      void ratingPersistence
        .finally(() => {
          pendingRatingPromises.current.delete(ratingPersistence);
        })
        .catch(() => undefined);
    },
    [
      getRating,
      initialFeed.studySessionId,
      rateCard,
      recordCriticalFailure,
      refreshFeed,
      startAttempt,
      studyService,
    ]
  );

  return {
    feed,
    onOccurrenceBecameActive,
    onRatingSelected,
    fatalError: fatalError ?? recallSession.loadError,
    extensionError,
    refreshError,
    retryFeedExtension,
    requestFeedExtension,
    ...recallSession,
  };
}
