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
  | Readonly<{ status: "empty" }>
  | Readonly<{
      deckId: DeckId;
      replaceSession: boolean;
      revision: number;
      status: "ready";
      transition: FocusTransition | null;
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
    revision: current.status === "ready" ? current.revision + 1 : 1,
    status: "ready",
    transition,
  };
}

export function consumeFocusedFeedTransition(state: FocusedFeedState): FocusedFeedState {
  return state.status === "ready"
    ? { ...state, replaceSession: false, transition: null }
    : state;
}
