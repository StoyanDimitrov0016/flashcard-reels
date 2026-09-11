import { describe, expect, it, vi } from "vitest";

import {
  openFocusedFeed,
  type FocusedFeedOptions,
} from "@/features/reels/presentation/open-focused-feed";
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
});
