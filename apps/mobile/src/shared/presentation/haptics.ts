import { Platform } from "react-native";
import * as Haptics from "expo-haptics";

import type { HapticEvent } from "@/features/preferences/application/haptics-policy";

export type { HapticEvent } from "@/features/preferences/application/haptics-policy";

export function triggerHaptic(event: HapticEvent): void {
  void playHaptic(event).catch(() => undefined);
}

async function playHaptic(event: HapticEvent): Promise<void> {
  if (Platform.OS === "android") {
    let androidHaptic = Haptics.AndroidHaptics.Confirm;
    if (event === "focus-completion") {
      androidHaptic = Haptics.AndroidHaptics.Long_Press;
    } else if (event === "rating-selection") {
      androidHaptic = Haptics.AndroidHaptics.Segment_Tick;
    }
    await Haptics.performAndroidHapticsAsync(androidHaptic);
    return;
  }
  if (event === "rating-selection") {
    await Haptics.selectionAsync();
  } else {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }
}
