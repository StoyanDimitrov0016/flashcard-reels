import { Platform } from "react-native";
import * as Haptics from "expo-haptics";

import type { HapticEvent } from "@/features/preferences/application/haptics-policy";

export type { HapticEvent } from "@/features/preferences/application/haptics-policy";

export function triggerHaptic(event: HapticEvent): void {
  void playHaptic(event).catch(() => undefined);
}

async function playHaptic(event: HapticEvent): Promise<void> {
  if (Platform.OS === "android") {
    await Haptics.performAndroidHapticsAsync(
      event === "focus-completion" ? Haptics.AndroidHaptics.Long_Press : Haptics.AndroidHaptics.Confirm
    );
    return;
  }
  if (event === "rating-selection") {
    await Haptics.selectionAsync();
  } else {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }
}
