import { useCallback, useEffect, useRef, useState } from "react";

import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";
import { shouldExtendReelFeed } from "@/features/reels/application/reel-extension-policy";
import type { PreparedReelFeed, PreparedReelOccurrence } from "@/features/reels/domain/reel-feed";
import { useRecallSession } from "@/features/reels/presentation/hooks/use-recall-session";
import { mergeMountedReelOccurrences } from "@/features/reels/presentation/mounted-reel-occurrences";
import type { RecallLevel } from "@/features/study/domain/recall-level";
import { useAppServices } from "@/infrastructure/app-services";
import { completeReelActivation } from "@/features/reels/application/reel-position-extension";

type UseReelControllerParameters = Readonly<{
  initialFeed: PreparedReelFeed;
  sourceCards: readonly Flashcard[];
}>;

export function useReelController({ initialFeed, sourceCards }: UseReelControllerParameters) {
  const { answerAudioService, reelFeedService, studyService } = useAppServices();
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
  const startingAttemptPromises = useRef(new Map<number, Promise<string>>());
  const pendingRatingPromises = useRef(new Set<Promise<void>>());
  const extensionInFlight = useRef<Promise<void> | null>(null);
  const recallSession = useRecallSession(
    studyService,
    initialFeed.studySessionId,
    feed.loadedFromReelPosition,
    feed.loadedThroughReelPosition
  );
  const { getAttemptId, getRecallLevel, rateCard, setAttemptId } = recallSession;

  const replaceFeed = useCallback((nextFeed: PreparedReelFeed) => {
    const occurrences = mergeMountedReelOccurrences(
      feedReference.current.occurrences,
      nextFeed.occurrences
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
        });
      startingAttemptPromises.current.set(occurrence.reelPosition, start);
      void start
        .finally(() => startingAttemptPromises.current.delete(occurrence.reelPosition))
        .catch(() => undefined);
      return start;
    },
    [getAttemptId, initialFeed.studySessionId, setAttemptId, studyService]
  );

  const requestFeedExtension = useCallback(() => {
    if (extensionInFlight.current) {
      return extensionInFlight.current;
    }
    const extension = Promise.resolve()
      .then(() =>
        reelFeedService.extendFeed(sourceCardsReference.current, initialFeed.studySessionId)
      )
      .then(replaceFeed);
    const trackedExtension = extension.finally(() => {
      if (extensionInFlight.current === trackedExtension) {
        extensionInFlight.current = null;
      }
    });
    extensionInFlight.current = trackedExtension;
    return trackedExtension;
  }, [initialFeed.studySessionId, reelFeedService, replaceFeed]);

  const awaitPendingRatings = useCallback(async () => {
    await Promise.allSettled(pendingRatingPromises.current);
  }, []);

  const onOccurrenceBecameActive = useCallback(
    (reelPosition: number) => {
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
        await startAttempt(occurrence);
        await completeReelActivation(
          () =>
            studyService.updateSessionReelPosition(
              initialFeed.studySessionId,
              occurrence.reelPosition
            ),
          async () => {
            if (occurrence.recurrenceId) {
              await studyService.consumeRecurrence(occurrence.recurrenceId);
            }
          },
          () => reelFeedService.recordVisibleCard(initialFeed.studySessionId, occurrence.card.id),
          () =>
            studyService.finalizeAttemptsOutsideEditableWindow(
              initialFeed.studySessionId,
              occurrence.reelPosition
            ),
          () => (shouldExtend ? requestFeedExtension() : Promise.resolve()),
          awaitPendingRatings
        );
      });
      activationQueue.current = activation.catch(() => undefined);
      void activation;
    },
    [
      awaitPendingRatings,
      initialFeed.studySessionId,
      requestFeedExtension,
      reelFeedService,
      startAttempt,
      studyService,
    ]
  );

  const onRatingSelected = useCallback(
    (occurrence: PreparedReelOccurrence, level: RecallLevel) => {
      const previousLevel = getRecallLevel(occurrence.reelPosition);
      const ratingPersistence = startAttempt(occurrence)
        .then((attemptId) => studyService.rateAttempt(attemptId, level))
        .then((updated) => {
          if (updated) {
            rateCard(occurrence.reelPosition, level);
            if (hasRecurrence(previousLevel) || hasRecurrence(level)) {
              void reelFeedService
                .refreshFeed(sourceCardsReference.current, initialFeed.studySessionId)
                .then(replaceFeed)
                .catch(() => undefined);
            }
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
      initialFeed.studySessionId,
      getRecallLevel,
      rateCard,
      reelFeedService,
      replaceFeed,
      startAttempt,
      studyService,
    ]
  );

  return {
    answerAudioService,
    feed,
    onOccurrenceBecameActive,
    onRatingSelected,
    requestFeedExtension,
    ...recallSession,
  };
}

function hasRecurrence(level: RecallLevel | undefined): boolean {
  return level === "again" || level === "hard";
}
