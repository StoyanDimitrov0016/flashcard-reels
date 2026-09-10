import { useCallback, useRef, useState } from "react";

import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";
import { shouldExtendReelFeed } from "@/features/reels/application/reel-extension-policy";
import type { PreparedReelFeed, PreparedReelOccurrence } from "@/features/reels/domain/reel-feed";
import { useRecallSession } from "@/features/reels/presentation/hooks/use-recall-session";
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
  const extensionInFlight = useRef(false);
  const activationQueue = useRef(Promise.resolve());
  const startingAttemptPromises = useRef(new Map<number, Promise<string>>());
  const recallSession = useRecallSession(
    studyService,
    initialFeed.studySessionId,
    feed.loadedFromReelPosition,
    feed.loadedThroughReelPosition
  );
  const { getAttemptId, getRecallLevel, rateCard, setAttemptId } = recallSession;

  const replaceFeed = useCallback((nextFeed: PreparedReelFeed) => {
    feedReference.current = nextFeed;
    setFeed(nextFeed);
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
      void start.finally(() => startingAttemptPromises.current.delete(occurrence.reelPosition));
      return start;
    },
    [getAttemptId, initialFeed.studySessionId, setAttemptId, studyService]
  );

  const onExtensionNeeded = useCallback(() => {
    if (extensionInFlight.current) {
      return Promise.resolve();
    }
    extensionInFlight.current = true;
    return reelFeedService
      .extendFeed(sourceCards, initialFeed.studySessionId)
      .then(replaceFeed)
      .then(() => undefined)
      .finally(() => {
        extensionInFlight.current = false;
      });
  }, [initialFeed.studySessionId, reelFeedService, replaceFeed, sourceCards]);

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
          () => (shouldExtend ? onExtensionNeeded() : Promise.resolve())
        );
      });
      activationQueue.current = activation.catch(() => undefined);
      void activation;
    },
    [initialFeed.studySessionId, onExtensionNeeded, reelFeedService, startAttempt, studyService]
  );

  const onRatingSelected = useCallback(
    (occurrence: PreparedReelOccurrence, level: RecallLevel) => {
      const previousLevel = getRecallLevel(occurrence.reelPosition);
      void startAttempt(occurrence)
        .then((attemptId) => studyService.rateAttempt(attemptId, level))
        .then((updated) => {
          if (updated) {
            rateCard(occurrence.reelPosition, level);
            if (hasRecurrence(previousLevel) || hasRecurrence(level)) {
              void reelFeedService
                .refreshFeed(sourceCards, initialFeed.studySessionId)
                .then(replaceFeed);
            }
          }
        });
    },
    [
      initialFeed.studySessionId,
      getRecallLevel,
      rateCard,
      reelFeedService,
      replaceFeed,
      sourceCards,
      startAttempt,
      studyService,
    ]
  );

  return {
    answerAudioService,
    feed,
    onOccurrenceBecameActive,
    onRatingSelected,
    ...recallSession,
  };
}

function hasRecurrence(level: RecallLevel | undefined): boolean {
  return level === "again" || level === "hard";
}
