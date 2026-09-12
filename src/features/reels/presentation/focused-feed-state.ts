import type { DeckId } from "@/features/decks/domain/deck.model";
import type {
  FocusedCardState,
  FocusedFeedOptions,
} from "@/features/reels/presentation/open-focused-feed";

export type FocusTransition = Readonly<{
  anchorFlashcardId: string;
  cardState: FocusedCardState;
}>;

export type FocusedFeedState =
  | Readonly<{ revision: number; status: "empty" }>
  | Readonly<{
      deckId: DeckId;
      replaceSession: boolean;
      revision: number;
      sessionId: string | null;
      status: "ready";
      transition: FocusTransition | null;
    }>;

export type PersistedFocusedSession = Readonly<{
  deckId: DeckId;
  id: string;
}>;

export function createFocusedFeedState(
  current: FocusedFeedState,
  deckId: DeckId,
  anchorFlashcardId?: string,
  options?: FocusedFeedOptions
): Extract<FocusedFeedState, { status: "ready" }> {
  const transition = anchorFlashcardId
    ? {
        anchorFlashcardId,
        cardState: options?.cardState ?? {
          cardId: anchorFlashcardId,
          recallLevel: null,
          revealed: false,
        },
      }
    : null;

  return {
    deckId,
    replaceSession: true,
    revision: current.revision + 1,
    sessionId: null,
    status: "ready",
    transition,
  };
}

export function confirmFocusedFeedSession(
  state: FocusedFeedState,
  sessionId: string,
  expectedRevision: number
): FocusedFeedState {
  return state.status === "ready" && state.revision === expectedRevision
    ? { ...state, replaceSession: false, sessionId, transition: null }
    : state;
}

export function reconcileFocusedFeedState(
  current: FocusedFeedState,
  persistedSession: PersistedFocusedSession | null
): FocusedFeedState {
  if (current.status === "ready" && current.replaceSession && current.sessionId === null) {
    return current;
  }
  if (!persistedSession) {
    return current.status === "empty" ? current : { revision: current.revision, status: "empty" };
  }
  if (
    current.status === "ready" &&
    current.deckId === persistedSession.deckId &&
    current.sessionId === persistedSession.id
  ) {
    return current;
  }
  return {
    deckId: persistedSession.deckId,
    replaceSession: false,
    revision: current.revision + 1,
    sessionId: persistedSession.id,
    status: "ready",
    transition: null,
  };
}
