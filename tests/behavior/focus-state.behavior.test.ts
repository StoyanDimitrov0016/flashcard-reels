import { describe, expect, it, vi } from "vitest";

import {
  openFocusedFeed,
  type FocusedFeedOptions,
} from "@/features/reels/presentation/open-focused-feed";

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
});
