import { describe, expect, it } from "vitest";

import {
  FOCUS_HOLD_DURATION_MS,
  HOLD_FEEDBACK_DELAY_MS,
  canStartFocusHold,
  transitionHoldToFocus,
} from "@/features/reels/presentation/hold-to-focus";
import { getTopToastOffset } from "@/shared/presentation/toast-layout";

describe("Hold-to-Focus behavior", () => {
  it("does not open or show feedback for a short press", () => {
    const pressed = transitionHoldToFocus("idle", "press-in");
    expect(transitionHoldToFocus(pressed.state, "release")).toEqual({ actions: [], state: "idle" });
  });

  it("preserves the delay and completion thresholds", () => {
    expect(HOLD_FEEDBACK_DELAY_MS).toBe(150);
    expect(FOCUS_HOLD_DURATION_MS).toBe(900);
  });

  it("shows feedback only after the delay and hides it on cancellation", () => {
    const feedback = transitionHoldToFocus("idle", "feedback-delay");
    expect(feedback.actions).toEqual(["show-hold-toast"]);
    expect(transitionHoldToFocus(feedback.state, "release").actions).toEqual(["hide-toast"]);
  });

  it("completes once and keeps the success toast through press-out", () => {
    const completion = transitionHoldToFocus("feedback", "complete");
    expect(completion.actions).toEqual(["hide-toast", "show-focused-toast", "open-focus"]);
    expect(transitionHoldToFocus(completion.state, "complete").actions).toEqual([]);
    expect(transitionHoldToFocus(completion.state, "release").actions).toEqual([]);
  });

  it("does not expose the Discover hold interaction in Focus", () => {
    expect(canStartFocusHold(true, false)).toBe(true);
    expect(canStartFocusHold(true, true)).toBe(false);
    expect(canStartFocusHold(false, false)).toBe(false);
  });

  it("uses a top toast offset beneath the safe-area inset", () => {
    expect(getTopToastOffset(34, 8)).toBe(42);
  });
});
