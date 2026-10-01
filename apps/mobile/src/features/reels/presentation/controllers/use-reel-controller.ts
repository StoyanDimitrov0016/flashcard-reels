import { useCallback, useEffect, useRef, useState } from "react";

import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";
import type { Rating } from "@/features/learning-engine/domain/rating";
import type { FocusedCardState } from "@/features/reels/presentation/open-focused-feed";
import type { PreparedReelFeed } from "@/features/study/domain/study-feed";
import type { StudyFeedSnapshot } from "@/features/study/domain/study.service";

import { useLearningProgressRevision } from "@/features/flashcard-progress/presentation/context/learning-progress-revision-context";
import { useReels } from "@/features/reels/presentation/dependencies/use-reels";
import { mergeMountedReelOccurrences } from "@/features/reels/presentation/mounted-reel-occurrences";
import { AppError } from "@/shared/errors/app-error";
import { toOperationError } from "@/shared/errors/normalize-error";
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
  const { studyService } = useReels();

  const { invalidateLearningProgress } = useLearningProgressRevision();

  const [feed, setFeed] = useState(initialFeed);

  const currentFeed = useRef(initialFeed);

  const cards = useRef(sourceCards);

  const sequence = useRef(0);

  const applied = useRef(0);

  const ended = useRef(false);

  const activatedPositions = useRef(new Set<number>());

  const ratingRequests = useRef(new Map<number, number>());

  const active = useRef(true);

  const critical = useRef<Error | null>(null);

  const extensionInFlight = useRef<Promise<void> | null>(null);

  const initialPosition = initialCardState
    ? (initialFeed.occurrences.find((item) => item.card.id === initialCardState.cardId)
        ?.reelPosition ?? initialFeed.currentReelPosition)
    : initialFeed.currentReelPosition;

  const [ratings, setRatings] = useState<ReadonlyMap<number, Rating>>(() =>
    initialCardState?.rating ? new Map([[initialPosition, initialCardState.rating]]) : new Map()
  );

  const ratingsRef = useRef(ratings);

  const [revealed, setRevealed] = useState<ReadonlySet<number>>(() =>
    initialCardState?.revealed ? new Set([initialPosition]) : new Set()
  );

  const [fatal, setFatal] = useState<Error | null>(null);

  const [extension, setExtension] = useState<Error | null>(null);

  const [refresh, setRefresh] = useState<Error | null>(null);

  useEffect(function ownControllerLifetime() {
    active.current = true;
    applied.current = sequence.current;
    return function releaseController() {
      active.current = false;
      sequence.current += 1;
      applied.current = Number.POSITIVE_INFINITY;
    };
  }, []);

  useEffect(
    function updateSourceCards() {
      cards.current = sourceCards;
    },
    [sourceCards]
  );

  const fail = useCallback(
    (error: unknown) => {
      if (error instanceof AppError && error.code === "STUDY_SESSION_ENDED") {
        if (!ended.current) {
          ended.current = true;
          invalidateLearningProgress();
        }
        return;
      }
      const normalized = toOperationError(error, {
        code: "STUDY_PERSISTENCE_FAILED",
        message: "Study progress could not be saved",
        context: { operation: "study-persistence" },
      });
      if (!critical.current) {
        critical.current = normalized;
        setFatal(normalized);
      }
    },
    [invalidateLearningProgress]
  );

  const applyRatings = useCallback((next: ReadonlyMap<number, Rating>) => {
    ratingsRef.current = next;
    setRatings(next);
  }, []);

  const replace = useCallback(
    (snapshot: StudyFeedSnapshot, started: number) => {
      if (!active.current || started <= applied.current) {
        return;
      }
      applied.current = started;
      const occurrences = mergeMountedReelOccurrences(
        currentFeed.current.occurrences,
        snapshot.feed.occurrences,
        {
          currentReelPosition: snapshot.feed.currentReelPosition,
          furthestReelPosition: snapshot.feed.furthestReelPosition,
        }
      );
      const mounted = {
        ...snapshot.feed,
        occurrences,
        loadedFromReelPosition:
          occurrences[0]?.reelPosition ?? snapshot.feed.loadedFromReelPosition,
        loadedThroughReelPosition:
          occurrences.at(-1)?.reelPosition ?? snapshot.feed.loadedThroughReelPosition,
      };
      currentFeed.current = mounted;
      setFeed(mounted);
      ratingRequests.current = new Map(
        [...ratingRequests.current].filter(
          ([position]) =>
            position >= mounted.loadedFromReelPosition &&
            position <= mounted.loadedThroughReelPosition
        )
      );
      activatedPositions.current = new Set(
        [...activatedPositions.current].filter(
          (position) =>
            position >= mounted.loadedFromReelPosition &&
            position <= mounted.loadedThroughReelPosition
        )
      );
      const nextRatings = new Map(
        [...ratingsRef.current].filter(
          ([position]) =>
            position >= mounted.loadedFromReelPosition &&
            position <= mounted.loadedThroughReelPosition
        )
      );
      for (const [position, rating] of snapshot.ratings) {
        if ((ratingRequests.current.get(position) ?? 0) <= started) {
          nextRatings.set(position, rating);
        }
      }
      applyRatings(nextRatings);
      setRevealed(
        (previous) =>
          new Set(
            [...previous].filter(
              (position) =>
                position >= mounted.loadedFromReelPosition &&
                position <= mounted.loadedThroughReelPosition
            )
          )
      );
    },
    [applyRatings]
  );

  useEffect(
    function loadPersistedRecall() {
      let current = true;
      const started = sequence.current;
      void studyService
        .refreshFeed({ sessionId: initialFeed.studySessionId, cards: sourceCards })
        .then((snapshot) => {
          if (current) {
            const range = currentFeed.current;
            const next = new Map(
              [...snapshot.ratings].filter(
                ([position]) =>
                  position >= range.loadedFromReelPosition &&
                  position <= range.loadedThroughReelPosition
              )
            );
            for (const [position, rating] of ratingsRef.current) {
              if (
                position >= range.loadedFromReelPosition &&
                position <= range.loadedThroughReelPosition
              ) {
                next.set(position, rating);
              }
            }
            if (initialCardState?.rating) {
              next.set(initialPosition, initialCardState.rating);
            }
            applyRatings(next);
          }
        })
        .catch((error: unknown) => {
          if (current && started === sequence.current) {
            fail(error);
          }
        });
      return function ignoreOldRecallLoad() {
        current = false;
      };
    },
    [
      studyService,
      initialFeed.studySessionId,
      sourceCards,
      initialCardState,
      initialPosition,
      applyRatings,
      fail,
    ]
  );

  const extend = useCallback(() => {
    if (extensionInFlight.current) {
      return extensionInFlight.current;
    }
    const started = ++sequence.current;
    const promise = studyService
      .extendFeed({ sessionId: initialFeed.studySessionId, cards: cards.current })
      .then((snapshot) => {
        if (active.current && started > applied.current) {
          replace(snapshot, started);
          setExtension(null);
        }
      })
      .catch((error: unknown) => {
        if (!active.current || started !== sequence.current) {
          return;
        }
        if (error instanceof AppError && error.code === "STUDY_SESSION_ENDED") {
          fail(error);
          return;
        }
        const normalized = toOperationError(error, {
          code: "FEED_EXTENSION_FAILED",
          message: "More cards could not be loaded",
          context: { operation: "reel-feed.extend" },
        });
        reportError(normalized, "Feed extension failure");
        setExtension(normalized);
        throw normalized;
      })
      .finally(() => {
        if (extensionInFlight.current === promise) {
          extensionInFlight.current = null;
        }
      });
    extensionInFlight.current = promise;
    return promise;
  }, [studyService, initialFeed.studySessionId, replace, fail]);

  const activate = useCallback(
    (position: number) => {
      if (critical.current || ended.current) {
        return;
      }
      const started = ++sequence.current;
      void studyService
        .activateCard({
          sessionId: initialFeed.studySessionId,
          cards: cards.current,
          reelPosition: position,
          loadedThroughReelPosition: currentFeed.current.loadedThroughReelPosition,
        })
        .then((result) => {
          activatedPositions.current.add(position);
          if (!active.current) {
            return;
          }
          if (result.snapshot) {
            replace(result.snapshot, started);
          }
          if (result.extensionError && started === sequence.current) {
            if (
              result.extensionError instanceof AppError &&
              result.extensionError.code === "STUDY_SESSION_ENDED"
            ) {
              fail(result.extensionError);
              return;
            }
            const normalized = toOperationError(result.extensionError, {
              code: "FEED_EXTENSION_FAILED",
              message: "More cards could not be loaded",
            });
            reportError(normalized, "Feed extension failure");
            setExtension(normalized);
          }
        })
        .catch((error: unknown) => {
          if (active.current) {
            fail(error);
          }
        });
    },
    [studyService, initialFeed.studySessionId, replace, fail]
  );

  const rate = useCallback(
    (position: number, rating: Rating) => {
      if (critical.current || ended.current) {
        return;
      }
      const started = ++sequence.current;
      ratingRequests.current.set(position, started);
      void studyService
        .rateCard({
          sessionId: initialFeed.studySessionId,
          cards: cards.current,
          reelPosition: position,
          rating,
          expectedAttempt:
            ratingsRef.current.has(position) || activatedPositions.current.has(position),
        })
        .then((result) => {
          if (!active.current) {
            return;
          }
          const saved = result.rating;
          const latest = ratingRequests.current.get(position) === started;
          if (saved && latest) {
            applyRatings(new Map(ratingsRef.current).set(position, saved));
          }
          if (result.status === "locked" && latest) {
            showErrorToast("This rating is already saved.");
          }
          if (result.snapshot && started > applied.current) {
            replace(result.snapshot, started);
            setRefresh(null);
          }
        })
        .catch((error: unknown) => {
          if (!active.current) {
            return;
          }
          if (
            error instanceof AppError &&
            error.code === "VIEW_LOAD_FAILED" &&
            error.context?.operation === "rated-feed.refresh"
          ) {
            if (
              error.context.status === "rated" &&
              ratingRequests.current.get(position) === started
            ) {
              applyRatings(new Map(ratingsRef.current).set(position, rating));
            }
            if (started === sequence.current) {
              setRefresh(error);
              reportError(error, "Feed refresh failure");
            }
            return;
          }
          fail(error);
        });
    },
    [studyService, initialFeed.studySessionId, applyRatings, replace, fail]
  );

  const toggle = useCallback((position: number) => {
    if (
      position < currentFeed.current.loadedFromReelPosition ||
      position > currentFeed.current.loadedThroughReelPosition
    ) {
      return;
    }
    setRevealed((previous) => {
      const next = new Set(previous);
      if (next.has(position)) {
        next.delete(position);
      } else {
        next.add(position);
      }
      return next;
    });
  }, []);

  const cardState = useCallback(
    (position: number) => ({
      rating: ratings.get(position) ?? null,
      revealed: revealed.has(position),
    }),
    [ratings, revealed]
  );

  const retryExtension = useCallback(() => {
    setExtension(null);
    void extend().catch(() => undefined);
  }, [extend]);

  return {
    feed,
    cardState,
    activate,
    rate,
    toggle,
    extend,
    retryExtension,
    feedback: { fatal, extension, refresh },
  };
}
