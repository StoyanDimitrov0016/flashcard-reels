import { describe, expect, it, vi } from "vitest";

import {
  openFocusedFeed,
  type FocusedFeedOptions,
} from "@/features/reels/presentation/open-focused-feed";
import {
  confirmFocusedFeedSession,
  reconcileFocusedFeedState,
  type FocusedFeedState,
} from "@/features/reels/presentation/focused-feed-state";
import type { RecallLevel } from "@/features/study/domain/recall-level";

const focusHandoffCases: readonly (readonly [boolean, RecallLevel | null])[] = [
  [true, "hard"],
  [false, null],
  [false, "easy"],
];

describe("focus state handoff", () => {
  it("passes the current reveal and rating state into the focused feed", () => {
    const startFocusedFeed = vi.fn();
    const navigate = vi.fn();
    const options: FocusedFeedOptions = {
      cardState: { cardId: "card-1", recallLevel: "hard", revealed: true },
    };

    openFocusedFeed("deck-1", startFocusedFeed, navigate, "card-1", options);

    expect(startFocusedFeed).toHaveBeenCalledWith("deck-1", "card-1", options);
    expect(navigate).toHaveBeenCalledWith("/(tabs)/focus");
  });

  it.each(focusHandoffCases)(
    "preserves revealed side and independent rating state (%s, %s)",
    (revealed, recallLevel) => {
      const startFocusedFeed = vi.fn();
      const navigate = vi.fn();
      const options: FocusedFeedOptions = {
        cardState: { cardId: "card-1", recallLevel, revealed },
      };

      openFocusedFeed("deck-1", startFocusedFeed, navigate, "card-1", options);

      expect(startFocusedFeed).toHaveBeenCalledWith("deck-1", "card-1", options);
      expect(options.cardState).toEqual({ cardId: "card-1", recallLevel, revealed });
    }
  );

  it("consumes the entry transition without changing the persistent Focus identity", () => {
    const state: FocusedFeedState = {
      deckId: "deck-1",
      replaceSession: true,
      revision: 4,
      sessionId: null,
      status: "ready",
      transition: {
        anchorFlashcardId: "card-1",
        cardState: { cardId: "card-1", recallLevel: "hard", revealed: true },
      },
    };

    const confirmed = confirmFocusedFeedSession(state, "session-a");
    expect(confirmed).toEqual({
      deckId: "deck-1",
      replaceSession: false,
      revision: 4,
      sessionId: "session-a",
      status: "ready",
      transition: null,
    });
    expect(reconcileFocusedFeedState(confirmed, { deckId: "deck-1", id: "session-a" })).toBe(
      confirmed
    );
  });

  it("keeps the same state identity when lifecycle rediscovers the prepared session", () => {
    const state: FocusedFeedState = {
      deckId: "deck-1",
      replaceSession: false,
      revision: 4,
      sessionId: "session-a",
      status: "ready",
      transition: null,
    };

    expect(reconcileFocusedFeedState(state, { deckId: "deck-1", id: "session-a" })).toBe(state);
  });

  it("remounts exactly once when lifecycle replaces an expired session", () => {
    const state: FocusedFeedState = {
      deckId: "deck-1",
      replaceSession: false,
      revision: 4,
      sessionId: "session-a",
      status: "ready",
      transition: null,
    };

    expect(reconcileFocusedFeedState(state, { deckId: "deck-1", id: "session-b" })).toEqual({
      deckId: "deck-1",
      replaceSession: false,
      revision: 5,
      sessionId: "session-b",
      status: "ready",
      transition: null,
    });
  });

  it("adopts a different valid persisted Focus deck and session", () => {
    const state: FocusedFeedState = {
      deckId: "deck-1",
      replaceSession: false,
      revision: 4,
      sessionId: "session-a",
      status: "ready",
      transition: null,
    };

    expect(reconcileFocusedFeedState(state, { deckId: "deck-2", id: "session-b" })).toEqual({
      deckId: "deck-2",
      replaceSession: false,
      revision: 5,
      sessionId: "session-b",
      status: "ready",
      transition: null,
    });
  });

  it("does not let lifecycle overwrite an explicit transition still being prepared", () => {
    const state: FocusedFeedState = {
      deckId: "deck-2",
      replaceSession: true,
      revision: 5,
      sessionId: null,
      status: "ready",
      transition: {
        anchorFlashcardId: "card-2",
        cardState: { cardId: "card-2", recallLevel: "easy", revealed: true },
      },
    };

    expect(reconcileFocusedFeedState(state, { deckId: "deck-1", id: "session-a" })).toBe(state);
  });
});
