import { useEffect, useRef, useState } from "react";

import type { DeckId } from "@/features/decks/domain/deck.model";
import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";
import type { StudySessionScope } from "@/features/study/domain/study-session.model";
import { useAppServices } from "@/infrastructure/app-services";

export type PreparedReelFeed = Readonly<{
  cards: Flashcard[];
  currentPosition: number;
  studySessionId: string;
}>;

type PreparationState = Readonly<{
  error: Error | null;
  feed: PreparedReelFeed | null;
}>;

type PreparationRequest = Readonly<{
  cards: readonly Flashcard[];
  deckId: DeckId | null;
  scope: StudySessionScope;
  promise: Promise<PreparedReelFeed>;
}>;

const initialState: PreparationState = { error: null, feed: null };

export function usePreparedReelFeed(
  cards: readonly Flashcard[],
  scope: StudySessionScope,
  deckId: DeckId | null,
  replaceExistingSession: boolean,
  onSessionStarted?: () => void
): PreparedReelFeed | null {
  const { reelFeedService, studyService } = useAppServices();
  const [state, setState] = useState<PreparationState>(initialState);
  const requestReference = useRef<PreparationRequest | null>(null);

  useEffect(() => {
    let active = true;

    const previousRequest = requestReference.current;
    const promise =
      previousRequest &&
      previousRequest.cards === cards &&
      previousRequest.deckId === deckId &&
      previousRequest.scope === scope
        ? previousRequest.promise
        : (() => {
            const preparedCards = reelFeedService.createFeed(cards);
            const nextPromise = studyService
              .openSession(scope, deckId, replaceExistingSession)
              .then((session) => ({
                cards: preparedCards,
                currentPosition: session.currentPosition,
                studySessionId: session.id,
              }));
            requestReference.current = { cards, deckId, promise: nextPromise, scope };
            void nextPromise.then(() => {
              onSessionStarted?.();
            });
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
            error: error instanceof Error ? error : new Error("Could not prepare reel feed"),
            feed: null,
          });
        }
      });

    return () => {
      active = false;
    };
  }, [
    cards,
    deckId,
    onSessionStarted,
    reelFeedService,
    replaceExistingSession,
    scope,
    studyService,
  ]);

  if (state.error) {
    throw state.error;
  }

  return state.feed;
}
