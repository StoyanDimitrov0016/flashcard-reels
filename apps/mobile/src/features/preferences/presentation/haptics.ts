import * as Haptics from "expo-haptics";

import type { HapticEvent } from "@/features/preferences/domain/haptic-event";

export type { HapticEvent } from "@/features/preferences/domain/haptic-event";

export function triggerHaptic(event: HapticEvent): void {
  void playHaptic(event).catch(() => undefined);
}

/**
 * These drive the vibration motor on Android, so they are felt even when the system's touch
 * feedback is off. `performAndroidHapticsAsync` follows that setting, and its subtlest effects
 * were often not felt at all.
 */
async function playHaptic(event: HapticEvent): Promise<void> {
  if (event === "rating-selection") {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } else if (event === "focus-completion") {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  } else {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }
}
