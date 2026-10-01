import { useEffect, useRef, useState } from "react";

import type { DeckId } from "@/features/decks/domain/deck.model";
import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";
import type { PreparedReelFeed } from "@/features/study/domain/study-feed";
import type { StudySessionScope } from "@/features/study/domain/study-session.model";
import type { StudyFeedService } from "@/features/study/domain/study.service";

import { useLearningProgressRevision } from "@/features/flashcard-progress/presentation/context/learning-progress-revision-context";
import { useReels } from "@/features/reels/presentation/dependencies/use-reels";
import { toOperationError } from "@/shared/errors/normalize-error";

type PreparationState = Readonly<{
  error: Error | null;
  feed: PreparedReelFeed | null;
  request: PreparationRequest | null;
}>;

type PreparationInput = Readonly<{
  cards: readonly Flashcard[];
  deckId: DeckId | null;
  anchorFlashcardId: string | null;
  progressRevision: number;
  scope: StudySessionScope;
  replaceExistingSession: boolean;
  service: StudyFeedService;
}>;
type PreparationRequest = PreparationInput &
  Readonly<{
    promise: Promise<PreparedReelFeed>;
  }>;

const initialState: PreparationState = { error: null, feed: null, request: null };

function matchesRequest(request: PreparationRequest | null, input: PreparationInput): boolean {
  return (
    request !== null &&
    request.cards === input.cards &&
    request.deckId === input.deckId &&
    request.anchorFlashcardId === input.anchorFlashcardId &&
    request.progressRevision === input.progressRevision &&
    request.scope === input.scope &&
    request.replaceExistingSession === input.replaceExistingSession &&
    request.service === input.service
  );
}

export function usePreparedReelFeed(
  cards: readonly Flashcard[],
  scope: StudySessionScope,
  deckId: DeckId | null,
  replaceExistingSession: boolean,
  anchorFlashcardId: string | null = null
): PreparedReelFeed | null {
  const { studyService } = useReels();
  const { revision: progressRevision } = useLearningProgressRevision();
  const [state, setState] = useState<PreparationState>(initialState);
  const requestReference = useRef<PreparationRequest | null>(null);

  useEffect(
    function prepareReelFeed() {
      let active = true;

      const previousRequest = requestReference.current;
      const input = {
        anchorFlashcardId,
        cards,
        deckId,
        progressRevision,
        scope,
        replaceExistingSession,
        service: studyService,
      };
      const request =
        previousRequest && matchesRequest(previousRequest, input)
          ? previousRequest
          : {
              ...input,
              promise: studyService
                .openFeed({
                  cards,
                  scope,
                  deckId,
                  replaceExisting: replaceExistingSession,
                  anchorFlashcardId,
                })
                .then((snapshot) => snapshot.feed),
            };
      requestReference.current = request;

      void request.promise
        .then((feed) => {
          if (active) {
            setState({ error: null, feed, request });
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
              request,
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
      studyService,
      replaceExistingSession,
      progressRevision,
      scope,
    ]
  );

  if (
    !matchesRequest(state.request, {
      anchorFlashcardId,
      cards,
      deckId,
      progressRevision,
      scope,
      replaceExistingSession,
      service: studyService,
    })
  ) {
    return null;
  }
  if (state.error) {
    throw state.error;
  }

  return state.feed;
}
