import { useRef, useState } from "react";

import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";
import { FEED_ENGINE_CONFIG } from "@/features/reels/config/feed-engine";
import type {
  PreparedReelFeed,
  PreparedReelOccurrence,
} from "@/features/reels/services/reel-feed.service";
import { useRecallSession } from "@/features/reels/hooks/use-recall-session";
import type { RecallLevel } from "@/features/study/domain/recall-level";
import { useAppServices } from "@/infrastructure/app-services";
import { persistPositionThenExtend } from "@/features/reels/services/reel-position-extension";

type UseReelControllerParameters = Readonly<{
  initialFeed: PreparedReelFeed;
  sourceCards: readonly Flashcard[];
}>;

export function useReelController({ initialFeed, sourceCards }: UseReelControllerParameters) {
  const { answerAudioService, reelFeedService, studyService } = useAppServices();
  const [feed, setFeed] = useState(initialFeed);
  const feedReference = useRef(initialFeed);
  const extensionInFlight = useRef(false);
  const startingAttemptPromises = useRef(new Map<number, Promise<string>>());
  const recallSession = useRecallSession(
    studyService,
    initialFeed.studySessionId,
    feed.loadedFromReelPosition,
    feed.loadedThroughReelPosition
  );

  const replaceFeed = (nextFeed: PreparedReelFeed) => {
    feedReference.current = nextFeed;
    setFeed(nextFeed);
  };

  const startAttempt = (occurrence: PreparedReelOccurrence): Promise<string> => {
    const existingAttemptId = recallSession.attemptIds.get(occurrence.reelPosition);
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
        recallSession.setAttemptId(occurrence.reelPosition, attemptId);
        return attemptId;
      });
    startingAttemptPromises.current.set(occurrence.reelPosition, start);
    void start.finally(() => startingAttemptPromises.current.delete(occurrence.reelPosition));
    return start;
  };

  const onExtensionNeeded = () => {
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
  };

  const onOccurrenceBecameActive = (occurrence: PreparedReelOccurrence) => {
    const currentFeed = feedReference.current;
    const localIndex = currentFeed.occurrences.findIndex(
      (current) => current.key === occurrence.key
    );
    const shouldExtend =
      localIndex >= 0 &&
      currentFeed.occurrences.length - localIndex <= FEED_ENGINE_CONFIG.extensionThreshold;

    void startAttempt(occurrence).then(() =>
      Promise.all([
        persistPositionThenExtend(
          () =>
            studyService.updateSessionReelPosition(
              initialFeed.studySessionId,
              occurrence.reelPosition
            ),
          () => (shouldExtend ? onExtensionNeeded() : Promise.resolve())
        ),
        studyService.finalizeAttemptsOutsideEditableWindow(
          initialFeed.studySessionId,
          occurrence.reelPosition
        ),
        occurrence.recurrenceId
          ? studyService.consumeRecurrence(occurrence.recurrenceId)
          : Promise.resolve(false),
      ])
    );
  };

  const onRatingSelected = (occurrence: PreparedReelOccurrence, level: RecallLevel) => {
    void startAttempt(occurrence)
      .then((attemptId) => studyService.rateAttempt(attemptId, level))
      .then((updated) => {
        if (updated) {
          recallSession.rateCard(occurrence.reelPosition, level);
          void reelFeedService
            .refreshFeed(sourceCards, initialFeed.studySessionId)
            .then(replaceFeed);
        }
      });
  };

  return {
    answerAudioService,
    feed,
    onOccurrenceBecameActive,
    onRatingSelected,
    ...recallSession,
  };
}
