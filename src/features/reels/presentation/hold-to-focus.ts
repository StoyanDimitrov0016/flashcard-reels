export const FOCUS_HOLD_DURATION_MS = 900;
export const HOLD_FEEDBACK_DELAY_MS = 150;

export type HoldToFocusState = "idle" | "feedback" | "completed";
export type HoldToFocusEvent = "press-in" | "feedback-delay" | "release" | "complete";
type HoldToFocusAction = "hide-toast" | "show-hold-toast" | "show-focused-toast" | "open-focus";

export function canStartFocusHold(isActive: boolean, showMainFeedLink: boolean): boolean {
  return isActive && !showMainFeedLink;
}

export type HoldTransition = Readonly<{
  actions: readonly HoldToFocusAction[];
  state: HoldToFocusState;
}>;

export function transitionHoldToFocus(
  state: HoldToFocusState,
  event: HoldToFocusEvent
): HoldTransition {
  if (event === "press-in") {
    return { actions: [], state: "idle" };
  }
  if (event === "feedback-delay" && state === "idle") {
    return { actions: ["show-hold-toast"], state: "feedback" };
  }
  if (event === "release" && state !== "completed") {
    return { actions: state === "feedback" ? ["hide-toast"] : [], state: "idle" };
  }
  if (event === "complete" && state !== "completed") {
    return { actions: ["hide-toast", "show-focused-toast", "open-focus"], state: "completed" };
  }
  return { actions: [], state };
}
