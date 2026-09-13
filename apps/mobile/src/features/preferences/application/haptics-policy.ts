export type HapticEvent = "rating-selection" | "focus-completion" | "reset-success";
export type HapticTrigger = (event: HapticEvent) => void;

export function createHapticPolicy(
  enabled: boolean,
  trigger: HapticTrigger
): Readonly<{
  focusCompleted: () => void;
  ratingSelected: () => void;
  resetCompleted: () => void;
}> {
  const run = (event: HapticEvent) => {
    if (enabled) {
      trigger(event);
    }
  };
  return {
    focusCompleted: () => run("focus-completion"),
    ratingSelected: () => run("rating-selection"),
    resetCompleted: () => run("reset-success"),
  };
}
