import { useEffect, useRef, useState } from "react";

import type { DeckId } from "@/features/decks/domain/deck.model";
import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";
import type { PreparedReelFeed } from "@/features/reels/domain/reel-feed";
import type { StudySessionScope } from "@/features/study/domain/study-session.model";
import { useLearningProgressReset } from "@/features/learner-profile/presentation/context/learning-progress-reset-context";
import { useAppServices } from "@/infrastructure/app-services";
import { toOperationError } from "@/shared/errors/normalize-error";

type PreparationState = Readonly<{
  error: Error | null;
  feed: PreparedReelFeed | null;
}>;

type PreparationRequest = Readonly<{
  cards: readonly Flashcard[];
  deckId: DeckId | null;
  anchorFlashcardId: string | null;
  resetRevision: number;
  scope: StudySessionScope;
  promise: Promise<PreparedReelFeed>;
}>;

const initialState: PreparationState = { error: null, feed: null };

export function usePreparedReelFeed(
  cards: readonly Flashcard[],
  scope: StudySessionScope,
  deckId: DeckId | null,
  replaceExistingSession: boolean,
  anchorFlashcardId: string | null = null
): PreparedReelFeed | null {
  const { reelFeedService } = useAppServices();
  const { revision: resetRevision } = useLearningProgressReset();
  const [state, setState] = useState<PreparationState>(initialState);
  const requestReference = useRef<PreparationRequest | null>(null);

  useEffect(
    function prepareReelFeed() {
      let active = true;

      const previousRequest = requestReference.current;
      const promise =
        previousRequest &&
        previousRequest.cards === cards &&
        previousRequest.deckId === deckId &&
        previousRequest.resetRevision === resetRevision &&
        previousRequest.scope === scope &&
        previousRequest.anchorFlashcardId === anchorFlashcardId
          ? previousRequest.promise
          : (() => {
              const nextPromise = reelFeedService.prepareFeed(
                cards,
                scope,
                deckId,
                replaceExistingSession,
                anchorFlashcardId
              );
              requestReference.current = {
                anchorFlashcardId,
                cards,
                deckId,
                promise: nextPromise,
                resetRevision,
                scope,
              };
              return nextPromise;
            })();

      void promise
        .then((feed) => {
          if (active) {
            setState({ error: null, feed });
          }
        })
        .catch((error: unknown) => {
          if (active) {
            setState({
              error: toOperationError(error, {
                code: "VIEW_LOAD_FAILED",
                context: { operation: "reel-feed.prepare" },
                message: "Could not prepare reel feed",
              }),
              feed: null,
            });
          }
        });

      return function cancelPreparedReelFeedUpdate() {
        active = false;
      };
    },
    [
      anchorFlashcardId,
      cards,
      deckId,
      reelFeedService,
      replaceExistingSession,
      resetRevision,
      scope,
    ]
  );

  if (state.error) {
    throw state.error;
  }

  return state.feed;
}
