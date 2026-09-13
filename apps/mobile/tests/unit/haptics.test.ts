import { describe, expect, it, vi } from "vitest";

import { createHapticPolicy } from "@/features/preferences/application/haptics-policy";

describe("preference-aware haptic policy", () => {
  it("does nothing when disabled", () => {
    const trigger = vi.fn();
    const policy = createHapticPolicy(false, trigger);
    policy.ratingSelected();
    policy.focusCompleted();
    policy.resetCompleted();
    expect(trigger).not.toHaveBeenCalled();
  });

  it("emits the three meaningful events when enabled", () => {
    const trigger = vi.fn();
    const policy = createHapticPolicy(true, trigger);
    policy.ratingSelected();
    policy.focusCompleted();
    policy.resetCompleted();
    expect(trigger.mock.calls).toEqual([
      ["rating-selection"],
      ["focus-completion"],
      ["reset-success"],
    ]);
  });
});
