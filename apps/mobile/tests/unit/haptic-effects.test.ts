import { beforeEach, describe, expect, it, vi } from "vitest";

const haptics = vi.hoisted(() => ({
  impactAsync: vi.fn(async () => undefined),
  notificationAsync: vi.fn(async () => undefined),
  performAndroidHapticsAsync: vi.fn(async () => undefined),
}));
vi.mock("expo-haptics", () => ({
  ...haptics,
  ImpactFeedbackStyle: { Heavy: "heavy", Medium: "medium" },
  NotificationFeedbackType: { Success: "success" },
}));

import { triggerHaptic } from "@/features/preferences/presentation/haptics";

describe("haptic effects", () => {
  beforeEach(() => vi.clearAllMocks());

  it("plays a motor effect for each event, never the touch-feedback API", () => {
    triggerHaptic("rating-selection");
    triggerHaptic("focus-completion");
    triggerHaptic("reset-success");

    expect(haptics.impactAsync.mock.calls).toEqual([["medium"], ["heavy"]]);
    expect(haptics.notificationAsync).toHaveBeenCalledWith("success");
    expect(haptics.performAndroidHapticsAsync).not.toHaveBeenCalled();
  });

  it("ignores a device that cannot play haptics", async () => {
    haptics.impactAsync.mockRejectedValueOnce(new Error("no vibrator"));

    expect(() => triggerHaptic("rating-selection")).not.toThrow();
    await Promise.resolve();
  });
});
